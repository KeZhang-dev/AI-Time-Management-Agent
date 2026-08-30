using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Models;
using TimeTracker.Api.Services;

namespace TimeTracker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, JwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("signup")]
    public async Task<ActionResult<AuthResponseDto>> Signup(SignupRequestDto dto)
    {
        var username = dto.Username.Trim();

        var exists = await db.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower());
        if (exists)
            return ValidationProblem("Username is already taken.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = "User",
            Name = username,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = jwtTokenService.GenerateToken(user);
        return Ok(new AuthResponseDto(token, ToDto(user)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto dto)
    {
        var username = dto.Username.Trim();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid username or password." });

        var token = jwtTokenService.GenerateToken(user);
        return Ok(new AuthResponseDto(token, ToDto(user)));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();
        return Ok(ToDto(user));
    }

    /// <summary>Profile display name only - never touches Username, the login identifier.</summary>
    [Authorize]
    [HttpPut("me/name")]
    public async Task<ActionResult<UserDto>> UpdateName(UpdateNameRequestDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        user.Name = dto.Name.Trim();
        if (user.Name.Length == 0)
            return ValidationProblem("Name cannot be empty.");

        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    // Data URLs are stored as-is (no separate blob storage exists yet) - capped
    // well under Postgres's per-value limits, generous enough for a compressed
    // profile photo without letting an unbounded payload bloat the users table.
    private const int MaxAvatarDataUrlLength = 2_000_000;

    [Authorize]
    [HttpPut("me/avatar")]
    public async Task<ActionResult<UserDto>> UpdateAvatar(UpdateAvatarRequestDto dto)
    {
        if (!dto.AvatarDataUrl.StartsWith("data:image/", StringComparison.Ordinal))
            return ValidationProblem("Avatar must be an image data URL.");

        if (dto.AvatarDataUrl.Length > MaxAvatarDataUrlLength)
            return ValidationProblem("Avatar image is too large.");

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        user.AvatarDataUrl = dto.AvatarDataUrl;
        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    private static readonly HashSet<string> KnownLlmProviders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Gemini", "DeepSeek",
    };

    /// <summary>
    /// Which ILlmService implementation answers this user's future chat requests -
    /// resolved per-request from this stored value by Program.cs's ILlmService factory.
    /// Takes effect immediately on the next request; nothing else needs to change.
    /// </summary>
    [Authorize]
    [HttpPut("me/model")]
    public async Task<ActionResult<UserDto>> UpdatePreferredLlmProvider(UpdatePreferredLlmProviderRequestDto dto)
    {
        if (!KnownLlmProviders.Contains(dto.PreferredLlmProvider))
            return ValidationProblem("Unknown model provider.");

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        user.PreferredLlmProvider = dto.PreferredLlmProvider;
        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    private static UserDto ToDto(User u) => new(u.Id, u.Username, u.Role, u.Name, u.AvatarDataUrl, u.PreferredLlmProvider);
}
