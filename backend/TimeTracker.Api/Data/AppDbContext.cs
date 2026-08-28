using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Models;

namespace TimeTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TimeRecord> TimeRecords => Set<TimeRecord>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Memory> Memories => Set<Memory>();
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<ScheduleProposal> ScheduleProposals => Set<ScheduleProposal>();
    public DbSet<ConversationMessage> ConversationMessages => Set<ConversationMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Username).HasColumnName("username").HasMaxLength(50).IsRequired();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).IsRequired().HasDefaultValue("User");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired().HasDefaultValue("");
            entity.Property(e => e.AvatarDataUrl).HasColumnName("avatar_data_url");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

            entity.HasIndex(e => e.Username).IsUnique();
        });

        modelBuilder.Entity<TimeRecord>(entity =>
        {
            entity.ToTable("time_records", t =>
                t.HasCheckConstraint("ck_time_records_end_after_start", "end_time > start_time"));
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.StartTime).HasColumnName("start_time").IsRequired();
            entity.Property(e => e.EndTime).HasColumnName("end_time");
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.StartTime);
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<Memory>(entity =>
        {
            entity.ToTable("memories");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.Content).HasColumnName("content").HasMaxLength(500).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<Schedule>(entity =>
        {
            // end_time = 00:00:00 is allowed as a special case meaning "runs to
            // midnight" (e.g. 22:00-00:00), matching ScheduleValidation's handling.
            entity.ToTable("schedules", t =>
                t.HasCheckConstraint("ck_schedules_end_after_start", "end_time > start_time OR end_time = '00:00:00'"));
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired().HasDefaultValue("Schedule");
            entity.Property(e => e.Date).HasColumnName("date").IsRequired();
            entity.Property(e => e.StartTime).HasColumnName("start_time").IsRequired();
            entity.Property(e => e.EndTime).HasColumnName("end_time").IsRequired();
            entity.Property(e => e.Activity).HasColumnName("activity").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(500);
            entity.Property(e => e.ProposalId).HasColumnName("proposal_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ProposalId);
        });

        modelBuilder.Entity<ScheduleProposal>(entity =>
        {
            entity.ToTable("schedule_proposals", t =>
                t.HasCheckConstraint("ck_schedule_proposals_status",
                    "status IN ('Pending','Approved','Cancelled','Expired','Failed')"));
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Date).HasColumnName("date").IsRequired();
            entity.Property(e => e.ItemsJson).HasColumnName("items_json").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(e => e.ResolvedAt).HasColumnName("resolved_at");

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<ConversationMessage>(entity =>
        {
            entity.ToTable("conversation_messages", t =>
                t.HasCheckConstraint("ck_conversation_messages_role", "role IN ('user','assistant')"));
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(16).IsRequired();
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.OverviewJson).HasColumnName("overview_json").HasColumnType("jsonb");
            entity.Property(e => e.ProposalId).HasColumnName("proposal_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });
    }
}
