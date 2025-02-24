const service = require("./tables.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");

/**
 * Middleware to check that body has data
 */
const hasData = (req, res, next) => {
  if (req.body.data) {
    return next();
  }
  next({ status: 400, message: "body must have data property" });
};

/**
 * Middleware for POST body validation
 */
const hasTableName = (req, res, next) => {
  const { data: { table_name } = {} } = req.body;
  if (table_name && table_name !== "" && table_name.length >= 2) {
    res.locals.table_name = table_name;
    return next();
  }
  next({
    status: 400,
    message: "A 'table_name' of at least 2 characters is required",
  });
};

const hasCapacity = (req, res, next) => {
  const { data: { capacity } = {} } = req.body;
  if (capacity && typeof capacity === "number" && capacity > 0) {
    return next();
  }
  next({
    status: 400,
    message: "A 'capacity' of at least 1 is required",
  });
};

/**
 * Validation Middleware for seat table requests
 */

const hasReservationId = (req, res, next) => {
  const { data: { reservation_id } = {} } = req.body;
  if (reservation_id) {
    res.locals.reservation_id = reservation_id;
    return next();
  }
  next({
    status: 400,
    message: "A 'reservation_id' is required",
  });
};

const reservationExists = async (req, res, next) => {
  const reservation_id = res.locals.reservation_id;
  const foundReservation = await service.readReservation(reservation_id);
  if (foundReservation) {
    res.locals.reservation = foundReservation;
    return next();
  }
  next({
    status: 404,
    message: `Reservation ${reservation_id} does not exist`,
  });
};

const reservationIsNotSeated = async (req, res, next) => {
  const { status } = res.locals.reservation;
  if (status !== "seated") {
    return next();
  }
  next({
    status: 400,
    message: `This reservation is already seated`,
  });
};

const tableIsUnoccupied = async (req, res, next) => {
  const { table_id } = req.params;
  const foundTable = await service.readTable(table_id);
  if (foundTable.reservation_id === null) {
    res.locals.table = foundTable;
    return next();
  }
  next({
    status: 400,
    message: "Selected table is occupied, please choose a different table",
  });
};

const tableHasValidCapacity = (req, res, next) => {
  const { people } = res.locals.reservation;
  const { capacity } = res.locals.table;
  if (capacity >= people) {
    return next();
  }
  next({
    status: 400,
    message:
      "Selected table does not have enough capacity for this reservation",
  });
};

/**
 * Validation Middleware for 'finish' table requests
 */
const tableExists = async (req, res, next) => {
  const { table_id } = req.params;
  const foundTable = await service.readTable(table_id);
  if (foundTable) {
    res.locals.table = foundTable;
    return next();
  }
  next({
    status: 404,
    message: `Table ${table_id} does not exist`,
  });
};

const tableIsOccupied = async (req, res, next) => {
  const table = res.locals.table;
  if (table.reservation_id !== null) {
    return next();
  }
  next({
    status: 400,
    message: "Selected table is not occupied.",
  });
};

/**
 * List handler for tables resources
 */
const list = async (req, res) => {
  res.json({
    data: await service.list(),
  });
};

/**
 *  Create handler for new table
 */
const create = async (req, res) => {
  const newTable = await service.create(req.body.data);
  res.status(201).json({ data: newTable });
};

/**
 *  Update handler for 'seating' reservation to table
 */
const seat = async (req, res) => {
  const reservation_id = res.locals.reservation_id;
  const { table_id } = res.locals.table;
  const updatedTable = {
    ...req.body.data,
    table_id,
  };
  await service.update(updatedTable, reservation_id);
  res.status(200).json({ data: updatedTable });
};

/**
 *  'Finish' handler for removing reservation from table
 */
const finish = async (req, res) => {
  const { reservation_id, table_id } = res.locals.table;
  const emptyTable = await service.finish(table_id, reservation_id);
  res.status(200).json({ data: emptyTable });
};

module.exports = {
  list: asyncErrorBoundary(list),
  create: [hasData, hasTableName, hasCapacity, asyncErrorBoundary(create)],
  seat: [
    hasData,
    hasReservationId,
    asyncErrorBoundary(reservationExists),
    reservationIsNotSeated,
    asyncErrorBoundary(tableIsUnoccupied),
    tableHasValidCapacity,
    asyncErrorBoundary(seat),
  ],
  finish: [
    asyncErrorBoundary(tableExists),
    asyncErrorBoundary(tableIsOccupied),
    asyncErrorBoundary(finish),
  ],
};
