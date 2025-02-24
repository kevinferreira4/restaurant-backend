const service = require("./reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");

/**
 * Formats a Date object as YYYY-MM-DD.
 *
 * @param date
 *  an instance of a date object
 * @returns {string}
 *  the specified Date formatted as YYYY-MM-DD
 */
const asDateString = date => {
  return `${date.getFullYear().toString(10)}-${(date.getMonth() + 1)
    .toString(10)
    .padStart(2, "0")}-${date.getDate().toString(10).padStart(2, "0")}`;
};

/**
 * Global variable declarations
 */
const today = asDateString(new Date()).replace(/[-]/g, "");
const currentTime = new Date()
  .toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  .replace(":", "");
const resTimeLowerLimit = "1030";
const resTimeUpperLimit = "2130";

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
 * Middleware to validate reservation_id
 */
const reservationExists = async (req, res, next) => {
  const { reservation_id } = req.params;
  const foundReservation = await service.read(reservation_id);
  if (foundReservation) {
    res.locals.reservation = foundReservation;
    return next();
  }
  next({
    status: 404,
    message: `Reservation ID ${reservation_id} does not exist.`,
  });
};

/**
 * Middleware for POST body validation
 */
const hasFirstName = (req, res, next) => {
  const { data: { first_name } = {} } = req.body;
  if (first_name && first_name !== "") {
    return next();
  }
  next({
    status: 400,
    message: "A 'first_name' is required",
  });
};

const hasLastName = (req, res, next) => {
  const { data: { last_name } = {} } = req.body;
  if (last_name && last_name !== "") {
    return next();
  }
  next({
    status: 400,
    message: "A 'last_name' is required",
  });
};

const hasMobileNumber = (req, res, next) => {
  const { data: { mobile_number } = {} } = req.body;
  const validPhoneNumber =
    /^[+]?(?=(?:[^\dx]*\d){7})(?:\(\d+(?:\.\d+)?\)|\d+(?:\.\d+)?)(?:[ -]?(?:\(\d+(?:\.\d+)?\)|\d+(?:\.\d+)?))*(?:[ ]?(?:x|ext)\.?[ ]?\d{1,5})?$/;
  if (mobile_number && mobile_number.match(validPhoneNumber)) {
    return next();
  }
  next({
    status: 400,
    message: "A valid 'mobile_number' is required",
  });
};

const hasReservationDate = (req, res, next) => {
  const { data: { reservation_date } = {} } = req.body;
  const validDate = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  if (reservation_date && reservation_date.match(validDate)) {
    res.locals.reservation_date = reservation_date;
    return next();
  }
  next({
    status: 400,
    message: "A valid 'reservation_date' is required",
  });
};

const hasValidReservationDate = (req, res, next) => {
  const resDateString = res.locals.reservation_date.replace(/[-]/g, "");
  const day = new Date(res.locals.reservation_date).getUTCDay();
  if ([2].includes(day)) {
    next({
      status: 400,
      message:
        "Restuarant is closed on Tuesdays. Please choose a different day.",
    });
  }
  if (resDateString < today) {
    next({
      status: 400,
      message: `Reservation must be for a future date.`,
    });
  }
  next();
};

const hasReservationTime = (req, res, next) => {
  const { data: { reservation_time } = {} } = req.body;
  const validTime = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
  if (reservation_time && reservation_time.match(validTime)) {
    res.locals.reservation_time = reservation_time.replace(":", "");
    return next();
  }
  next({
    status: 400,
    message: "A valid 'reservation_time' is required",
  });
};

const hasValidReservationTime = (req, res, next) => {
  if (
    res.locals.reservation_time >= resTimeLowerLimit &&
    res.locals.reservation_time <= resTimeUpperLimit
  ) {
    return next();
  }
  next({
    status: 400,
    message: "Reservations must be between 10:30 AM and 9:30 PM PST",
  });
};

const hasValidSameDayReservation = (req, res, next) => {
  const resDateString = res.locals.reservation_date.replace(/[-]/g, "");
  if (resDateString === today && res.locals.reservation_time <= currentTime) {
    next({
      status: 400,
      message: `Reservations for today must be in the future`,
    });
  }
  return next();
};

const hasPeople = (req, res, next) => {
  const { data: { people } = {} } = req.body;
  if (people && people !== "" && typeof people === "number" && people >= 1) {
    return next();
  }
  next({
    status: 400,
    message: "A valid number of 'people' is required",
  });
};

const hasBookedReservationStatus = (req, res, next) => {
  const { data: { status } = {} } = req.body;
  if (!status || status === "booked") {
    return next();
  }
  next({
    status: 400,
    message: `Cannot create a new Reservation with status ${status}`,
  });
};

/**
 * Middleware for PUT validation
 */

const hasValidReservationStatus = (req, res, next) => {
  const validStatus = ["booked", "seated", "finished", "cancelled"];
  const { data: { status } = {} } = req.body;
  if (validStatus.includes(status)) {
    res.locals.status = status;
    return next();
  }
  next({
    status: 400,
    message: `Status ${status} is invalid`,
  });
};

const reservationStatusIsNotFinished = (req, res, next) => {
  const { status } = res.locals.reservation;
  if (status === "finished") {
    return next({
      status: 400,
      message: "This reservation is already finished",
    });
  }
  next();
};

/**
 * List handler for reservation resources
 */
const list = async (req, res) => {
  if (req.query.date) {
    const { date } = req.query;
    const reservations = await service.list(date);
    const filtered = reservations.filter(
      reservation =>
        !reservation.status ||
        reservation.status === "booked" ||
        reservation.status === "seated"
    );
    res.json({
      data: filtered,
    });
  }
  if (req.query.mobile_number) {
    const { mobile_number } = req.query;
    res.json({ data: await service.search(mobile_number) });
  }
};

/**
 *
 * Read handler for reservation
 */
const read = async (req, res) => {
  const { reservation_id } = res.locals.reservation;
  res.json({ data: await service.read(reservation_id) });
};

/**
 * Create handler for new reservation
 */
const create = async (req, res) => {
  const newReservation = await service.create(req.body.data);
  res.status(201).json({ data: newReservation });
};

/**
 * Update handler for reservation status
 */
const updateStatus = async (req, res) => {
  const { reservation_id } = res.locals.reservation;
  const status = res.locals.status;
  res
    .status(200)
    .json({ data: await service.updateStatus(reservation_id, status) });
};

/**
 * Update handler for reservation info
 */
const updateReservation = async (req, res) => {
  const { reservation_id } = res.locals.reservation;
  const updatedReservation = {
    ...req.body.data,
    reservation_id,
  };
  res
    .status(200)
    .json({ data: await service.update(reservation_id, updatedReservation) });
};

module.exports = {
  create: [
    hasData,
    hasFirstName,
    hasLastName,
    hasMobileNumber,
    hasReservationDate,
    hasValidReservationDate,
    hasReservationTime,
    hasValidSameDayReservation,
    hasValidReservationTime,
    hasPeople,
    hasBookedReservationStatus,
    asyncErrorBoundary(create),
  ],
  list: asyncErrorBoundary(list),
  read: [asyncErrorBoundary(reservationExists), asyncErrorBoundary(read)],
  update: [
    hasData,
    hasFirstName,
    hasLastName,
    hasMobileNumber,
    hasReservationDate,
    hasValidReservationDate,
    hasReservationTime,
    hasValidSameDayReservation,
    hasValidReservationTime,
    hasPeople,
    asyncErrorBoundary(reservationExists),
    asyncErrorBoundary(updateReservation),
  ],
  updateStatus: [
    asyncErrorBoundary(reservationExists),
    hasValidReservationStatus,
    reservationStatusIsNotFinished,
    asyncErrorBoundary(updateStatus),
  ],
};
