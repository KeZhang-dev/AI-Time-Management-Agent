using System.ComponentModel.DataAnnotations;

namespace TimeTracker.Api.Dtos;

public record SignupRequestDto(
    [Required, MinLength(3), MaxLength(50)] string Username,
    [Required, MinLength(8), MaxLength(100)] string Password
);

public record LoginRequestDto(
    [Required] string Username,
    [Required] string Password
);

public record UserDto(
    Guid Id,
    string Username,
    string Role,
    string Name,
    string? AvatarDataUrl
);

public record AuthResponseDto(
    string Token,
    UserDto User
);

public record UpdateNameRequestDto(
    [Required, MinLength(1), MaxLength(100)] string Name
);

public record UpdateAvatarRequestDto(
    [Required] string AvatarDataUrl
);
