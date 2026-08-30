using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TimeTracker.Api.Data;
using TimeTracker.Api.Options;
using TimeTracker.Api.Services;
using TimeTracker.Api.Services.AiTools;
using TimeTracker.Api.Services.Scheduling;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "Frontend";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<JwtTokenService>();

builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection("Gemini"));
builder.Services.Configure<DeepSeekOptions>(builder.Configuration.GetSection("DeepSeek"));
builder.Services.AddHttpClient<GeminiService>();
builder.Services.AddHttpClient<DeepSeekService>();
builder.Services.AddHttpContextAccessor();

// Which concrete ILlmService backs a given request - resolved per-request from the
// authenticated user's stored PreferredLlmProvider (AuthController's PUT /me/model is
// the only way that value changes), falling back to the server-wide Llm:Provider config
// value when there's no authenticated user, no stored preference, or an unrecognized
// one. AiAgentService/AiController stay unaware of any of this - they just inject
// ILlmService like any other dependency.
builder.Services.AddScoped<ILlmService>(sp =>
{
    var defaultProvider = builder.Configuration["Llm:Provider"] ?? "Gemini";

    var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
    var userIdClaim = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);

    var provider = defaultProvider;
    if (userIdClaim is not null && Guid.TryParse(userIdClaim, out var userId))
    {
        var db = sp.GetRequiredService<AppDbContext>();
        var preferred = db.Users.Where(u => u.Id == userId).Select(u => u.PreferredLlmProvider).FirstOrDefault();
        if (preferred is not null)
            provider = preferred;
    }

    return string.Equals(provider, "DeepSeek", StringComparison.OrdinalIgnoreCase)
        ? sp.GetRequiredService<DeepSeekService>()
        : sp.GetRequiredService<GeminiService>();
});

builder.Services.AddScoped<IAgentTool, GetTodayRecordsTool>();
builder.Services.AddScoped<IAgentTool, GetRecentRecordsTool>();
builder.Services.AddScoped<IAgentTool, GetWeeklySummaryTool>();
builder.Services.AddScoped<IAgentTool, GetCategoryBreakdownTool>();
builder.Services.AddScoped<IAgentTool, GetRecordsByDateRangeTool>();
builder.Services.AddScoped<IAgentTool, GetUserMemoryTool>();
builder.Services.AddScoped<IAgentTool, SaveUserMemoryTool>();
builder.Services.AddScoped<IAgentTool, ProposeScheduleTool>();
builder.Services.AddScoped<IAgentTool, LogTimeActivityTool>();
builder.Services.AddScoped<AgentToolRegistry>();
builder.Services.AddScoped<SchedulePatternService>();
builder.Services.AddScoped<ActiveSessionService>();
builder.Services.AddScoped<AiAgentService>();
builder.Services.AddScoped<CheckinSeedBuilder>();

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        if (error is not null)
        {
            app.Logger.LogError(error, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
