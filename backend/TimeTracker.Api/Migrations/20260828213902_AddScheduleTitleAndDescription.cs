using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleTitleAndDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "schedules",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "title",
                table: "schedules",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "Schedule");

            // Backfill: give pre-existing schedule rows the real title from the
            // proposal they were approved from, instead of the generic default.
            migrationBuilder.Sql(@"
                UPDATE schedules s
                SET title = sp.title
                FROM schedule_proposals sp
                WHERE s.proposal_id = sp.id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                table: "schedules");

            migrationBuilder.DropColumn(
                name: "title",
                table: "schedules");
        }
    }
}
