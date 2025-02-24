const knex = require("../db/connection");

const create = newReservation => {
  return knex("reservations")
    .insert(newReservation)
    .returning("*")
    .then(reservationData => reservationData[0]);
};

const list = reservation_date => {
  return knex("reservations")
    .select("*")
    .where({ reservation_date })
    .orderBy("reservation_time");
};

const read = reservation_id => {
  return knex("reservations").select("*").where({ reservation_id }).first();
};

const update = (reservation_id, updatedReservation) => {
  return knex("reservations")
    .select("*")
    .where({ reservation_id })
    .update(updatedReservation, "*")
    .then(reservationData => reservationData[0]);
};

const updateStatus = (reservation_id, status) => {
  return knex("reservations")
    .select("*")
    .where({ reservation_id })
    .update({ status }, "*")
    .then(updatedReservations => updatedReservations[0]);
};

const search = mobile_number => {
  return knex("reservations")
    .whereRaw(
      "translate(mobile_number, '() -', '') like ?",
      `%${mobile_number.replace(/\D/g, "")}%`
    )
    .orderBy("reservation_date");
};

module.exports = {
  create,
  list,
  read,
  update,
  updateStatus,
  search,
};
