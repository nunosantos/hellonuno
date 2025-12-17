using k8s;
using k8s.Models;

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

// Add Kubernetes client
builder.Services.AddSingleton<IKubernetes>(sp =>
{
    var config = KubernetesClientConfiguration.IsInCluster() 
        ? KubernetesClientConfiguration.InClusterConfig() 
        : KubernetesClientConfiguration.BuildDefaultConfig();
    return new Kubernetes(config);
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

// Get all pods in the namespace with metrics
app.MapGet("/api/pods", async (IKubernetes k8s) => 
{
    try
    {
        var namespaceName = Environment.GetEnvironmentVariable("POD_NAMESPACE") ?? "hellonuno";
        var pods = await k8s.CoreV1.ListNamespacedPodAsync(namespaceName);
        
        var podMetrics = pods.Items.Select(pod => new
        {
            name = pod.Metadata.Name,
            @namespace = pod.Metadata.NamespaceProperty,
            nodeName = pod.Spec.NodeName,
            podIP = pod.Status.PodIP,
            phase = pod.Status.Phase,
            startTime = pod.Status.StartTime,
            containerStatuses = pod.Status.ContainerStatuses?.Select(cs => new
            {
                name = cs.Name,
                image = cs.Image,
                imageID = cs.ImageID,
                ready = cs.Ready,
                restartCount = cs.RestartCount,
                state = cs.State.Running != null ? "Running" : 
                        cs.State.Waiting != null ? "Waiting" : 
                        cs.State.Terminated != null ? "Terminated" : "Unknown"
            }).ToList(),
            labels = pod.Metadata.Labels,
            annotations = pod.Metadata.Annotations,
            conditions = pod.Status.Conditions?.Select(c => new
            {
                type = c.Type,
                status = c.Status,
                reason = c.Reason,
                message = c.Message
            }).ToList()
        }).ToList();

        return Results.Ok(new
        {
            @namespace = namespaceName,
            totalPods = pods.Items.Count,
            pods = podMetrics,
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            error = "Failed to query Kubernetes API",
            message = ex.Message,
            hint = "Ensure the service account has proper RBAC permissions to list pods"
        }, statusCode: 500);
    }
})
.WithName("GetAllPods")
.WithOpenApi();

// Get GitHub deployment information
app.MapGet("/api/github/deployment", async () => 
{
    try
    {
        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("User-Agent", "HelloNuno-DevOps-Dashboard");
        
        var githubToken = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
        if (!string.IsNullOrEmpty(githubToken))
        {
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {githubToken}");
        }

        var owner = Environment.GetEnvironmentVariable("GITHUB_OWNER") ?? "nunosantos";
        var repo = Environment.GetEnvironmentVariable("GITHUB_REPO") ?? "hellonuno";
        
        // Get latest commits
        var commitsUrl = $"https://api.github.com/repos/{owner}/{repo}/commits?per_page=5";
        var commitsResponse = await httpClient.GetStringAsync(commitsUrl);
        var commits = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(commitsResponse);
        
        // Get latest workflow runs
        var workflowsUrl = $"https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page=5";
        var workflowsResponse = await httpClient.GetStringAsync(workflowsUrl);
        var workflows = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(workflowsResponse);

        // Get current deployment info from environment
        var deploymentInfo = new
        {
            repository = new
            {
                owner = owner,
                name = repo,
                url = $"https://github.com/{owner}/{repo}"
            },
            deployed = new
            {
                commitSha = Environment.GetEnvironmentVariable("GIT_COMMIT") ?? "unknown",
                commitShort = (Environment.GetEnvironmentVariable("GIT_COMMIT") ?? "unknown").Substring(0, Math.Min(7, (Environment.GetEnvironmentVariable("GIT_COMMIT") ?? "unknown").Length)),
                branch = Environment.GetEnvironmentVariable("GIT_BRANCH") ?? "unknown",
                buildNumber = Environment.GetEnvironmentVariable("BUILD_NUMBER") ?? "unknown",
                deployedAt = Environment.GetEnvironmentVariable("DEPLOYED_AT") ?? "unknown",
                deployedBy = Environment.GetEnvironmentVariable("DEPLOYED_BY") ?? "ArgoCD"
            },
            latestCommits = commits,
            latestWorkflows = workflows,
            timestamp = DateTime.UtcNow
        };

        return Results.Ok(deploymentInfo);
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            error = "Failed to fetch GitHub information",
            message = ex.Message,
            hint = "Ensure GITHUB_TOKEN is set if repository is private"
        }, statusCode: 500);
    }
})
.WithName("GetGitHubDeploymentInfo")
.WithOpenApi();

app.Run();

record HelloResponse(string Message, DateTime Timestamp, string ServerName);
record BackendInfo(string Name, string Version, string Runtime, string Host, DateTime Timestamp);
