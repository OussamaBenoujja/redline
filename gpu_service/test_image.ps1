# Test Image Endpoint: /v1/image/generate
# Uses scene data from the LLM output (Scene 0: Detective Silas Vane)

$uri = "http://localhost:8000/v1/image/generate"

$body = @{
    prompt              = "Heavy fog, cobblestone streets, detective in trenchcoat adjusting collar, gas lamp flickering at the end of the alley, long shadows, low angle shot of Silas standing in a foggy alley, his trench coat flapping slightly in the damp air"
    negative_prompt     = "ugly, deformed, disfigured, poor quality, bad anatomy"
    width               = 832
    height              = 832
    steps               = 20
    cfg                 = 7.0
    seed                = 42
    lora_scale          = 0.8
    character_signature = "detective in trenchcoat, fedora, rugged usage"
    framing             = "full_body_centered_30pct"
} | ConvertTo-Json -Depth 5

Write-Host "Sending request to $uri..." -ForegroundColor Cyan
Write-Host "Payload size: $([System.Text.Encoding]::UTF8.GetByteCount($body)) bytes" -ForegroundColor Gray

# Robust .NET HttpClient usage
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(300)

$content = New-Object System.Net.Http.StringContent($body, [System.Text.Encoding]::UTF8, "application/json")

$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
    # Force synchronous execution for simplicity in script
    $responseTask = $client.PostAsync($uri, $content)
    $responseTask.Wait()
    $response = $responseTask.Result
    
    $sw.Stop()
    Write-Host "Response received in $($sw.Elapsed.TotalSeconds) seconds!" -ForegroundColor Green

    if ($response.IsSuccessStatusCode) {
        $imgBytesTask = $response.Content.ReadAsByteArrayAsync()
        $imgBytesTask.Wait()
        $imgBytes = $imgBytesTask.Result
        
        $outFile = "output_silas_scene0.png"
        [System.IO.File]::WriteAllBytes($outFile, $imgBytes)
        
        Write-Host "Success! Image saved to: $outFile" -ForegroundColor Green
        
        # Try to open the image (windows specific)
        if (Get-Command "start" -ErrorAction SilentlyContinue) {
            start $outFile
        }
    }
    else {
        $errorContentTask = $response.Content.ReadAsStringAsync()
        $errorContentTask.Wait()
        $errBody = $errorContentTask.Result
        
        Write-Error "Request Failed: $($response.StatusCode)"
        Write-Error "Server Response: $errBody"
    }
}
catch {
    Write-Error "Client Error: $($_.Exception.Message)"
}
finally {
    $client.Dispose()
}
