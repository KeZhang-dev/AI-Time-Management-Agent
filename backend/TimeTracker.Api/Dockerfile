# syntax=docker/dockerfile:1

# ---- base: runtime image + non-root user + port the container will actually listen on ----
# Build context is this directory (backend/TimeTracker.Api) - the project has no
# ProjectReferences to anything outside it, so no other part of the repo is needed here.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
# $APP_UID is a non-root user baked into the official .NET 8+ runtime images - running as
# it instead of root is standard practice for a production container.
USER $APP_UID
WORKDIR /app
# Azure Container Apps has no single mandatory port - it forwards to whatever "target
# port" you configure on the Container App's ingress. 8080 is the .NET runtime image's
# own non-root default since .NET 8, so it's used here as the container's listening port;
# set the Container App's ingress target port to 8080 to match.
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# ---- build: SDK image, restore + compile ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Restore first, from just the project file, so this layer is cached across source-only
# changes (Docker only re-runs restore when TimeTracker.Api.csproj itself changes).
COPY ["TimeTracker.Api.csproj", "./"]
RUN dotnet restore "TimeTracker.Api.csproj"

# Now bring in the rest of the source (filtered by .dockerignore) and build.
COPY . .
RUN dotnet build "TimeTracker.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

# ---- publish: produce the final trimmed output set ----
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "TimeTracker.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# ---- final: runtime image + published app only (no SDK, no source, no build tools) ----
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# No secrets, no connection string, no local-only config are set here - every one of
# Jwt:Key, ConnectionStrings:Default, Gemini:ApiKey, DeepSeek:ApiKey must be supplied at
# deploy time as environment variables (double-underscore form, e.g.
# ConnectionStrings__Default, ASP.NET Core's standard container config convention - no
# code change needed, Program.cs already reads configuration this way).
ENTRYPOINT ["dotnet", "TimeTracker.Api.dll"]
