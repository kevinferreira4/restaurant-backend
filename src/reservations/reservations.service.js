const knex = require("../db/connection");

const create = async (newReservation) => {
  const nowUTC = new Date().toISOString(); // Ensure created_at is UTC
  newReservation.reservation_date = new Date(newReservation.reservation_date).toISOString(); // Store in UTC

  const reservationData = await knex("reservations")
    .insert(newReservation)
    .returning("*");

  return reservationData[0];
};


const list = async (reservation_date) => {
  return knex("reservations")
    .select("*")
    .whereRaw("reservation_date::date = ?", [reservation_date]) // Compare only the date part
    .orderBy("reservation_time");
};


const read = reservation_id => {
  return knex("reservations").select("*").where({ reservation_id }).first();
};

const update = async (reservation_id, updatedReservation) => {
  const reservationData = await knex("reservations")
    .where({ reservation_id })
    .update(updatedReservation)
    .returning("*"); // Ensure returning the updated row

  return reservationData[0]; // Return the first result
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
