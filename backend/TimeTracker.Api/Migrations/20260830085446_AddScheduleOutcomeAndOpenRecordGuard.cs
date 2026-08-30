using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleOutcomeAndOpenRecordGuard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "outcome_evaluated_at",
                table: "schedule_proposals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "outcome_summary_json",
                table: "schedule_proposals",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_time_records_user_id_open",
                table: "time_records",
                column: "user_id",
                unique: true,
                filter: "end_time IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_time_records_user_id_open",
                table: "time_records");

            migrationBuilder.DropColumn(
                name: "outcome_evaluated_at",
                table: "schedule_proposals");

            migrationBuilder.DropColumn(
                name: "outcome_summary_json",
                table: "schedule_proposals");
        }
    }
}
