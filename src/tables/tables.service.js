const knex = require("../db/connection");

const create = newTable => {
  return knex("tables")
    .insert(newTable)
    .returning("*")
    .then(tableData => tableData[0]);
};

const list = () => {
  return knex("tables").select("*").orderBy("table_name");
};

const readTable = table_id => {
  return knex("tables").select("*").where({ table_id }).first();
};

const readReservation = reservation_id => {
  return knex("reservations").select("*").where({ reservation_id }).first();
};

const update = async (updatedTable, reservation_id) => {
  try {
    await knex.transaction(async trx => {
      await trx("reservations")
        .where({ reservation_id })
        .update({ status: "seated" }, "*");

      const tableData = await trx("tables")
        .select("*")
        .update({ reservation_id }, "*")
        .where({ table_id: updatedTable.table_id });

      return tableData[0];
    });
  } catch (error) {
    console.log(error);
  }
};

const finish = async (table_id, reservation_id) => {
  try {
    await knex.transaction(async trx => {
      await trx("reservations")
        .where({ reservation_id })
        .update({ status: "finished" }, "*");

      const tableData = await trx("tables")
        .where({ table_id })
        .update({ reservation_id: null }, "*");

      return tableData[0];
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  create,
  list,
  readTable,
  readReservation,
  update,
  finish,
};
