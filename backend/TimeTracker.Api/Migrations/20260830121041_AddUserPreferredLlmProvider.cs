using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPreferredLlmProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "preferred_llm_provider",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Gemini");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "preferred_llm_provider",
                table: "users");
        }
    }
}
