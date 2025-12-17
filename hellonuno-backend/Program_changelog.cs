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

        // Get latest commits on master
        var latestCommitsUrl = $"https://api.github.com/repos/{owner}/{repo}/commits?sha=master&per_page=10";
        var latestCommitsResponse = await httpClient.GetStringAsync(latestCommitsUrl);
        var latestCommits = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(latestCommitsResponse);

        // Get commits since deployed version (changelog)
        var changelogUrl = $"https://api.github.com/repos/{owner}/{repo}/commits?sha={deployedCommit}&per_page=10";
        var changelogResponse = await httpClient.GetStringAsync(changelogUrl);
        var changelog = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(changelogResponse);

        // Calculate drift (commits not yet deployed)
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
                        date = commit.GetProperty("commit").GetProperty("author").GetProperty("date").GetString(),
                        url = commit.GetProperty("html_url").GetString()
                    });
                }
            }
        }

        // Get merged PRs
        var prsUrl = $"https://api.github.com/repos/{owner}/{repo}/pulls?state=closed&sort=updated&direction=desc&per_page=10";
        var prsResponse = await httpClient.GetStringAsync(prsUrl);
        var prs = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(prsResponse);
        
        var mergedPrs = new List<object>();
        foreach (var pr in prs.EnumerateArray())
        {
            if (pr.TryGetProperty("merged_at", out var mergedAt) && mergedAt.ValueKind != System.Text.Json.JsonValueKind.Null)
            {
                mergedPrs.Add(new
                {
                    number = pr.GetProperty("number").GetInt32(),
                    title = pr.GetProperty("title").GetString(),
                    author = pr.GetProperty("user").GetProperty("login").GetString(),
                    mergedAt = mergedAt.GetString(),
                    url = pr.GetProperty("html_url").GetString()
                });
                
                if (mergedPrs.Count >= 5) break;
            }
        }

        // Build changelog entries
        var changelogEntries = new List<object>();
        foreach (var commit in changelog.EnumerateArray().Take(10))
        {
            changelogEntries.Add(new
            {
                sha = commit.GetProperty("sha").GetString()?.Substring(0, 7),
                fullSha = commit.GetProperty("sha").GetString(),
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
                commit = new
                {
                    sha = deployedCommit.Substring(0, 7),
                    fullSha = deployedCommit,
                    message = deployedCommitData.GetProperty("commit").GetProperty("message").GetString()?.Split('\n')[0],
                    author = deployedCommitData.GetProperty("commit").GetProperty("author").GetProperty("name").GetString(),
                    date = deployedCommitData.GetProperty("commit").GetProperty("author").GetProperty("date").GetString(),
                    url = $"https://github.com/{owner}/{repo}/commit/{deployedCommit}"
                },
                deployedAt = deployedAt,
                deployedBy = deployedBy,
                compareUrl = $"https://github.com/{owner}/{repo}/compare/{deployedCommit}...master"
            },
            changelog = changelogEntries,
            drift = new
            {
                hasDrift = driftCount > 0,
                commitsAhead = driftCount,
                pendingCommits = drift,
                compareUrl = $"https://github.com/{owner}/{repo}/compare/{deployedCommit}...master"
            },
            pullRequests = mergedPrs,
            links = new
            {
                fullChangelog = $"https://github.com/{owner}/{repo}/commits/master",
                releases = $"https://github.com/{owner}/{repo}/releases",
                compareWithLatest = $"https://github.com/{owner}/{repo}/compare/{deployedCommit}...master"
            },
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            error = "Failed to fetch changelog",
            message = ex.Message
        }, statusCode: 500);
    }
})
.WithName("GetDeploymentChangelog")
.WithOpenApi();
