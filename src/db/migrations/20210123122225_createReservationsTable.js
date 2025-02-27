exports.up = function (knex) {
  return knex.schema.createTable("reservations", (table) => {
    table.increments("reservation_id").primary();
    table.string("first_name").notNullable();
    table.string("last_name").notNullable();
    table.string("mobile_number").notNullable();
    table.timestamp("reservation_date").notNullable(); // Changed from `date` to `timestamp`
    table.time("reservation_time").notNullable(); // Can be kept if timezones don’t matter
    table.integer("people").notNullable();
    table.string("observation").notNullable();
    table.string("table_name").nullable();
    table.boolean("guest_arrive").defaultTo(false);
    table.timestamps(true, true); // Automatically sets created_at & updated_at in UTC
  });
};


exports.down = function (knex) {
  return knex.schema.dropTable("reservations");
};


exports.down = function (knex) {
  return knex.schema.dropTable("reservations");
};
