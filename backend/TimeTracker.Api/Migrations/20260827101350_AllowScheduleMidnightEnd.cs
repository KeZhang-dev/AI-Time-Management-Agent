using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AllowScheduleMidnightEnd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_schedules_end_after_start",
                table: "schedules");

            migrationBuilder.AddCheckConstraint(
                name: "ck_schedules_end_after_start",
                table: "schedules",
                sql: "end_time > start_time OR end_time = '00:00:00'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_schedules_end_after_start",
                table: "schedules");

            migrationBuilder.AddCheckConstraint(
                name: "ck_schedules_end_after_start",
                table: "schedules",
                sql: "end_time > start_time");
        }
    }
}
