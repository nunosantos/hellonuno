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

// Get comprehensive service status (GitHub + K8s + Deployment metadata)
app.MapGet("/api/services", async (IKubernetes k8s) => 
{
    try
    {
        var namespaceName = Environment.GetEnvironmentVariable("POD_NAMESPACE") ?? "hellonuno";
        
        // Get all pods
        var pods = await k8s.CoreV1.ListNamespacedPodAsync(namespaceName);
        
        // Group pods by service
        var backendPods = pods.Items.Where(p => p.Metadata.Labels?.ContainsKey("app") == true && 
                                                  p.Metadata.Labels["app"].Contains("backend")).ToList();
        var frontendPods = pods.Items.Where(p => p.Metadata.Labels?.ContainsKey("app") == true && 
                                                   p.Metadata.Labels["app"].Contains("frontend")).ToList();

        // Helper function to extract service info
        var getServiceInfo = (List<V1Pod> servicePods, string serviceName, string repoPath) => {
            var firstPod = servicePods.FirstOrDefault();
            var gitCommit = firstPod?.Metadata?.Annotations?.ContainsKey("git.commit.sha") == true 
                ? firstPod.Metadata.Annotations["git.commit.sha"] 
                : "unknown";
            var gitBranch = firstPod?.Metadata?.Annotations?.ContainsKey("git.branch") == true 
                ? firstPod.Metadata.Annotations["git.branch"] 
                : "unknown";
            var deployedAt = firstPod?.Metadata?.Annotations?.ContainsKey("deployed.at") == true 
                ? firstPod.Metadata.Annotations["deployed.at"] 
                : "unknown";
            var deployedBy = firstPod?.Metadata?.Annotations?.ContainsKey("deployed.by") == true 
                ? firstPod.Metadata.Annotations["deployed.by"] 
                : "unknown";

            var healthyPods = servicePods.Count(p => p.Status.Phase == "Running" && 
                                                      p.Status.ContainerStatuses?.All(cs => cs.Ready) == true);
            
            return new {
                name = serviceName,
                github = new {
                    commit = gitCommit,
                    commitShort = gitCommit.Length > 7 ? gitCommit.Substring(0, 7) : gitCommit,
                    branch = gitBranch,
                    repository = $"https://github.com/nunosantos/hellonuno/tree/{gitBranch}/{repoPath}",
                    commitUrl = $"https://github.com/nunosantos/hellonuno/commit/{gitCommit}"
                },
                deployment = new {
                    status = healthyPods == servicePods.Count ? "Healthy" : "Degraded",
                    deployedAt = deployedAt,
                    deployedBy = deployedBy,
                    version = gitCommit.Length > 7 ? gitCommit.Substring(0, 7) : gitCommit
                },
                kubernetes = new {
                    podsReady = $"{healthyPods}/{servicePods.Count}",
                    totalPods = servicePods.Count,
                    healthyPods = healthyPods,
                    pods = servicePods.Select(pod => new {
                        name = pod.Metadata.Name,
                        nodeName = pod.Spec.NodeName,
                        podIP = pod.Status.PodIP,
                        phase = pod.Status.Phase,
                        ready = pod.Status.ContainerStatuses?.All(cs => cs.Ready) == true,
                        restartCount = pod.Status.ContainerStatuses?.Sum(cs => cs.RestartCount) ?? 0,
                        startTime = pod.Status.StartTime,
                        image = pod.Status.ContainerStatuses?.FirstOrDefault()?.Image
                    }).ToList()
                },
                observability = new {
                    metrics = $"https://grafana.local/d/service-{serviceName}",
                    logs = $"https://kibana.local/app/logs?service={serviceName}",
                    traces = $"https://jaeger.local/search?service={serviceName}",
                    apm = $"https://apm.local/services/{serviceName}"
                },
                documentation = new {
                    api = $"https://github.com/nunosantos/hellonuno/blob/{gitBranch}/{repoPath}/README.md",
                    readme = $"https://github.com/nunosantos/hellonuno/blob/{gitBranch}/{repoPath}/README.md",
                    runbook = $"https://github.com/nunosantos/hellonuno/wiki/{serviceName}-Runbook",
                    swagger = serviceName == "backend" ? "/swagger" : null
                }
            };
        };

        var services = new List<object> {
            getServiceInfo(backendPods, "backend", "hellonuno-backend"),
            getServiceInfo(frontendPods, "frontend", "hellonuno-frontend")
        };

        return Results.Ok(new {
            @namespace = namespaceName,
            environment = app.Environment.EnvironmentName,
            totalServices = services.Count,
            services = services,
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new {
            error = "Failed to aggregate service information",
            message = ex.Message
        }, statusCode: 500);
    }
})
.WithName("GetServicesOverview")
.WithOpenApi();

// Get deployment changelog with drift detection
app.MapGet("/api/changelog/{service}", async (string service, IKubernetes k8s) => 
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
        var namespaceName = Environment.GetEnvironmentVariable("POD_NAMESPACE") ?? "hellonuno";
        
        // Get deployed commit SHA from pod annotations
        var pods = await k8s.CoreV1.ListNamespacedPodAsync(namespaceName);
        var servicePod = pods.Items.FirstOrDefault(p => 
            p.Metadata.Labels?.ContainsKey("app") == true && 
            p.Metadata.Labels["app"].Contains(service));
        
        var deployedCommit = servicePod?.Metadata?.Annotations?.ContainsKey("git.commit.sha") == true 
            ? servicePod.Metadata.Annotations["git.commit.sha"] 
            : null;
        var deployedAt = servicePod?.Metadata?.Annotations?.ContainsKey("deployed.at") == true 
            ? servicePod.Metadata.Annotations["deployed.at"] 
            : null;
        var deployedBy = servicePod?.Metadata?.Annotations?.ContainsKey("deployed.by") == true 
            ? servicePod.Metadata.Annotations["deployed.by"] 
            : null;

        if (string.IsNullOrEmpty(deployedCommit))
        {
            return Results.Json(new { error = "No deployment information found" }, statusCode: 404);
        }

        // Get commit details for deployed version
        var deployedCommitUrl = $"https://api.github.com/repos/{owner}/{repo}/commits/{deployedCommit}";
        var deployedCommitResponse = await httpClient.GetStringAsync(deployedCommitUrl);
        var deployedCommitData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(deployedCommitResponse);

        // Get commits in deployed version
        var changelogUrl = $"https://api.github.com/repos/{owner}/{repo}/commits?sha={deployedCommit}&per_page=10";
        var changelogResponse = await httpClient.GetStringAsync(changelogUrl);
        var changelog = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(changelogResponse);

        // Calculate drift
        var latestCommitsUrl = $"https://api.github.com/repos/{owner}/{repo}/commits?sha=master&per_page=1";
        var latestResponse = await httpClient.GetStringAsync(latestCommitsUrl);
        var latestCommits = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(latestResponse);
        var latestCommitSha = latestCommits[0].GetProperty("sha").GetString();
        
        var drift = new List<object>();
        var driftCount = 0;

        if (latestCommitSha != deployedCommit)
        {
            var compareUrl = $"https://api.github.com/repos/{owner}/{repo}/compare/{deployedCommit}...master";
            var compareResponse = await httpClient.GetStringAsync(compareUrl);
            var compareData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(compareResponse);
            
            driftCount = compareData.GetProperty("ahead_by").GetInt32();
            
            if (compareData.TryGetProperty("commits", out var driftCommits))
            {
                foreach (var commit in driftCommits.EnumerateArray().Take(5))
                {
                    drift.Add(new
                    {
                        sha = commit.GetProperty("sha").GetString()?.Substring(0, 7),
                        message = commit.GetProperty("commit").GetProperty("message").GetString()?.Split('\n')[0],
                        author = commit.GetProperty("commit").GetProperty("author").GetProperty("name").GetString(),
                        date = commit.GetProperty("commit").GetProperty("author").GetProperty("date").GetString()
                    });
                }
            }
        }

        // Build changelog
        var changelogEntries = new List<object>();
        foreach (var commit in changelog.EnumerateArray().Take(10))
        {
            changelogEntries.Add(new
            {
                sha = commit.GetProperty("sha").GetString()?.Substring(0, 7),
                message = commit.GetProperty("commit").GetProperty("message").GetString()?.Split('\n')[0],
                author = commit.GetProperty("commit").GetProperty("author").GetProperty("name").GetString(),
                date = commit.GetProperty("commit").GetProperty("author").GetProperty("date").GetString(),
                url = commit.GetProperty("html_url").GetString()
            });
        }

        return Results.Ok(new
        {
            service = service,
            deployed = new
            {
                sha = deployedCommit.Substring(0, 7),
                message = deployedCommitData.GetProperty("commit").GetProperty("message").GetString()?.Split('\n')[0],
                author = deployedCommitData.GetProperty("commit").GetProperty("author").GetProperty("name").GetString(),
                deployedAt = deployedAt,
                deployedBy = deployedBy,
                url = $"https://github.com/{owner}/{repo}/commit/{deployedCommit}"
            },
            changelog = changelogEntries,
            drift = new
            {
                hasDrift = driftCount > 0,
                commitsAhead = driftCount,
                commits = drift
            },
            links = new
            {
                compare = $"https://github.com/{owner}/{repo}/compare/{deployedCommit}...master",
                fullChangelog = $"https://github.com/{owner}/{repo}/commits/master"
            },
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = "Failed to fetch changelog", message = ex.Message }, statusCode: 500);
    }
})
.WithName("GetDeploymentChangelog")
.WithOpenApi();

app.Run();

record HelloResponse(string Message, DateTime Timestamp, string ServerName);
record BackendInfo(string Name, string Version, string Runtime, string Host, DateTime Timestamp);

// Get DORA metrics from GitHub
app.MapGet("/api/metrics/dora", async () => 
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
        
        // Get workflow runs for the last 30 days
        var since = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-ddTHH:mm:ssZ");
        var workflowsUrl = $"https://api.github.com/repos/{owner}/{repo}/actions/runs?created=>={since}&per_page=100";
        var workflowsResponse = await httpClient.GetStringAsync(workflowsUrl);
        var workflows = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(workflowsResponse);

        var totalRuns = workflows.GetProperty("total_count").GetInt32();
        var workflowArray = workflows.GetProperty("workflow_runs");
        
        var successCount = 0;
        var failureCount = 0;
        var totalDuration = TimeSpan.Zero;
        var deployments = new List<DateTime>();

        foreach (var run in workflowArray.EnumerateArray())
        {
            var status = run.GetProperty("status").GetString();
            var conclusion = run.TryGetProperty("conclusion", out var concl) ? concl.GetString() : null;
            
            if (status == "completed")
            {
                if (conclusion == "success") successCount++;
                if (conclusion == "failure") failureCount++;
                
                var createdAt = DateTime.Parse(run.GetProperty("created_at").GetString() ?? "");
                var updatedAt = DateTime.Parse(run.GetProperty("updated_at").GetString() ?? "");
                totalDuration += (updatedAt - createdAt);
                deployments.Add(createdAt);
            }
        }

        // Calculate DORA metrics
        var deploymentFrequency = totalRuns / 30.0; // per day
        var leadTime = totalRuns > 0 ? totalDuration.TotalMinutes / totalRuns : 0; // avg minutes
        var changeFailureRate = totalRuns > 0 ? (double)failureCount / totalRuns * 100 : 0;
        
        // Calculate deployment velocity
        var deploymentsLast7Days = deployments.Count(d => d > DateTime.UtcNow.AddDays(-7));
        var deploymentsLast24Hours = deployments.Count(d => d > DateTime.UtcNow.AddDays(-1));

        return Results.Ok(new
        {
            dora = new
            {
                deploymentFrequency = new
                {
                    perDay = Math.Round(deploymentFrequency, 2),
                    last7Days = deploymentsLast7Days,
                    last24Hours = deploymentsLast24Hours,
                    rating = deploymentFrequency > 1 ? "Elite" : deploymentFrequency > 0.2 ? "High" : "Medium"
                },
                leadTimeForChanges = new
                {
                    averageMinutes = Math.Round(leadTime, 2),
                    rating = leadTime < 60 ? "Elite" : leadTime < 1440 ? "High" : "Medium"
                },
                changeFailureRate = new
                {
                    percentage = Math.Round(changeFailureRate, 2),
                    failures = failureCount,
                    total = totalRuns,
                    rating = changeFailureRate < 15 ? "Elite" : changeFailureRate < 30 ? "High" : "Medium"
                },
                timeToRestore = new
                {
                    averageMinutes = 15, // Placeholder - would need incident data
                    rating = "High"
                }
            },
            period = "Last 30 days",
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            error = "Failed to calculate DORA metrics",
            message = ex.Message
        }, statusCode: 500);
    }
})
.WithName("GetDORAMetrics")
.WithOpenApi();
