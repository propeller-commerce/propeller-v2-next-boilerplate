# Fix TypeScript unknown types to any
$files = @(
    "app/category/[id]/[slug]/page.tsx",
    "app/page.tsx",
    "app/product/[productId]/[slug]/page.tsx",
    "app/search/[term]/page.tsx"
)

foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $content = $content -replace '\(product: unknown\)', '(product: any)'
    $content = $content -replace '\(item: unknown,', '(item: any,'
    $content = $content -replace '\(v: unknown\)', '(v: any)'
    Set-Content $file $content -NoNewline
    Write-Host "Fixed $file"
}

Write-Host "All files fixed!"
