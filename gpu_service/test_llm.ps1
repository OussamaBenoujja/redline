# Test LLM Endpoint: /v1/llm/direct

$uri = "http://localhost:8000/v1/llm/direct"

$chapterText = @"
The fog hung heavy over the cobblestone streets of Old London, a thick, suffocating blanket that dampened sound and obscured vision. Detective Silas Vane adjusted the collar of his trench coat, the damp air seeping into his bones. He wasn't supposed to be here, not tonight. But the letter had been specific.

'Midnight. The Blackwood Alley. Come alone.'

Silas checked his pocket watch. 11:58 PM. The ticking of the mechanism felt loud in the oppressive silence. He stepped into the alley, his boots splashing in a shallow puddle. A single gas lamp flickered at the far end, casting long, dancing shadows that seemed to claw at the brick walls.

Suddenly, a figure emerged from the gloom. Tall, slender, wrapped in a dark cloak that seemed to merge with the shadows. Silas's hand drifted to his revolver.

'You came,' a voice whispered, smooth as velvet but cold as ice.

'I don't leave loose ends,' Silas replied, his voice gritty. 'Who are you?'

The figure stepped closer, the gaslight catching the rim of a porcelain mask. 'I am the one who knows what you did in Calcutta, Silas.'
"@

$body = @{
    chapter_id       = "test-ch-1"
    text             = $chapterText
    n_scenes         = 3
    known_characters = @(
        @{
            character_id = "silas"
            token        = "char_silas"
            signature    = "detective in trenchcoat, fedora, rugged usage"
        }
    )
} | ConvertTo-Json -Depth 5

Write-Host "Sending request to $uri..." -ForegroundColor Cyan
Write-Host "Payload size: $([System.Text.Encoding]::UTF8.GetByteCount($body)) bytes" -ForegroundColor Gray

# Robust .NET HttpClient usage to fix output disposal
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

    $responseBodyTask = $response.Content.ReadAsStringAsync()
    $responseBodyTask.Wait()
    $responseString = $responseBodyTask.Result

    if ($response.IsSuccessStatusCode) {
        # Pretty print if JSON
        try {
            # Try to format as JSON
            $jsonObj = $responseString | ConvertFrom-Json
            Write-Host ($jsonObj | ConvertTo-Json -Depth 10)
        }
        catch {
            Write-Host $responseString
        }
    }
    else {
        Write-Error "Request Failed: $($response.StatusCode)"
        Write-Error "Server Response: $responseString"
    }
}
catch {
    Write-Error "Client Error: $($_.Exception.Message)"
}
finally {
    $client.Dispose()
}
