var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

// Health check endpoint for Kubernetes
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .WithName("HealthCheck")
   .WithOpenApi();

// Ready check endpoint for Kubernetes
app.MapGet("/ready", () => Results.Ok(new { status = "ready", timestamp = DateTime.UtcNow }))
   .WithName("ReadyCheck")
   .WithOpenApi();

// Main API endpoint
app.MapGet("/api/hello", () => new HelloResponse("Hello Nuno!", DateTime.UtcNow, Environment.MachineName))
   .WithName("GetHello")
   .WithOpenApi();

// Get greeting with custom name
app.MapGet("/api/hello/{name}", (string name) => new HelloResponse($"Hello {name}!", DateTime.UtcNow, Environment.MachineName))
   .WithName("GetHelloByName")
   .WithOpenApi();

// Get backend info
app.MapGet("/api/info", () => new BackendInfo(
    "hellonuno-backend",
    "1.0.0",
    Environment.GetEnvironmentVariable("DOTNET_VERSION") ?? System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
    Environment.MachineName,
    DateTime.UtcNow
))
.WithName("GetInfo")
.WithOpenApi();

// Get Kubernetes system info (safe, non-sensitive data only)
app.MapGet("/api/system", () => 
{
    var process = System.Diagnostics.Process.GetCurrentProcess();
    var uptime = TimeSpan.FromMilliseconds(Environment.TickCount64);
    
    var systemInfo = new
    {
        service = "backend",
        pod = new
        {
            name = Environment.GetEnvironmentVariable("HOSTNAME") ?? Environment.MachineName,
            @namespace = Environment.GetEnvironmentVariable("POD_NAMESPACE") ?? "unknown",
            serviceAccount = Environment.GetEnvironmentVariable("SERVICE_ACCOUNT") ?? "default",
            nodeName = Environment.GetEnvironmentVariable("NODE_NAME") ?? "unknown",
            podIp = Environment.GetEnvironmentVariable("POD_IP") ?? "unknown"
        },
        resources = new
        {
            memoryUsageMB = process.WorkingSet64 / 1024.0 / 1024.0,
            cpuCores = Environment.ProcessorCount,
            threadCount = process.Threads.Count,
            gcMemoryMB = GC.GetTotalMemory(false) / 1024.0 / 1024.0,
            gen0Collections = GC.CollectionCount(0),
            gen1Collections = GC.CollectionCount(1),
            gen2Collections = GC.CollectionCount(2)
        },
        platform = new
        {
            os = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
            architecture = System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString(),
            runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription
        },
        health = new
        {
            status = "Healthy",
            uptime = uptime.ToString(@"dd\.hh\:mm\:ss"),
            uptimeSeconds = (long)uptime.TotalSeconds,
            processId = process.Id,
            startTime = process.StartTime.ToUniversalTime(),
            environment = app.Environment.EnvironmentName
        },
        timestamp = DateTime.UtcNow
    };
    
    return Results.Ok(systemInfo);
})
.WithName("GetSystemInfo")
.WithOpenApi();

// Get cluster overview with observability links
app.MapGet("/api/cluster", () => 
{
    var clusterInfo = new
    {
        cluster = new
        {
            name = Environment.GetEnvironmentVariable("CLUSTER_NAME") ?? "minikube",
            @namespace = Environment.GetEnvironmentVariable("POD_NAMESPACE") ?? "hellonuno",
            environment = app.Environment.EnvironmentName
        },
        observability = new
        {
            grafana = Environment.GetEnvironmentVariable("GRAFANA_URL") ?? "http://localhost:3000",
            prometheus = Environment.GetEnvironmentVariable("PROMETHEUS_URL") ?? "http://localhost:9090",
            jaeger = Environment.GetEnvironmentVariable("JAEGER_URL") ?? null as string,
            kibana = Environment.GetEnvironmentVariable("KIBANA_URL") ?? null as string,
            argocd = Environment.GetEnvironmentVariable("ARGOCD_URL") ?? "https://localhost:8443"
        },
        services = new
        {
            backend = new
            {
                name = "hellonuno-backend",
                replicas = Environment.GetEnvironmentVariable("BACKEND_REPLICAS") ?? "2",
                endpoint = "/api/system"
            },
            frontend = new
            {
                name = "hellonuno-frontend",
                replicas = Environment.GetEnvironmentVariable("FRONTEND_REPLICAS") ?? "2"
            }
        },
        timestamp = DateTime.UtcNow
    };
    
    return Results.Ok(clusterInfo);
})
.WithName("GetClusterInfo")
.WithOpenApi();

app.Run();

record HelloResponse(string Message, DateTime Timestamp, string ServerName);
record BackendInfo(string Name, string Version, string Runtime, string Host, DateTime Timestamp);
