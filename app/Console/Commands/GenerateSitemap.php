<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class GenerateSitemap extends Command
{
    /**
     * @var string
     */
    protected $signature = 'sitemap:generate';

    /**
     * @var string
     */
    protected $description = 'Generate sitemap.xml and robots.txt for public frontend pages';

    /**
     * Public indexable frontend paths with sitemap priority.
     *
     * @var array<string, string>
     */
    private const PATHS = [
        '/' => '1.0',
        '/postcode' => '0.8',
        '/address' => '0.8',
        '/pricing' => '0.8',
        '/developers' => '0.8',
        '/api-docs' => '0.8',
        '/product' => '0.8',
        '/postcode-lookup' => '0.8',
        '/address-finder' => '0.8',
        '/api-access' => '0.8',
        '/bulk-processing' => '0.8',
        '/resources' => '0.6',
        '/help-centre' => '0.6',
        '/system-status' => '0.6',
        '/data-sources' => '0.6',
        '/changelog' => '0.6',
        '/company' => '0.6',
        '/about' => '0.6',
        '/contact' => '0.6',
        '/accessibility' => '0.3',
        '/privacy' => '0.3',
        '/cookies' => '0.3',
        '/terms' => '0.3',
    ];

    public function handle(): int
    {
        $baseUrl = rtrim((string) config('app.frontend_url'), '/');

        if ($baseUrl === '') {
            $this->error('FRONTEND_URL is empty. Set FRONTEND_URL in your .env file.');

            return self::FAILURE;
        }

        $publicDir = base_path('frontend/public');
        File::ensureDirectoryExists($publicDir);

        $lastmod = now()->toDateString();
        $sitemap = $this->buildSitemapXml($baseUrl, $lastmod);
        $robots = $this->buildRobotsTxt($baseUrl);

        $sitemapPath = $publicDir.DIRECTORY_SEPARATOR.'sitemap.xml';
        $robotsPath = $publicDir.DIRECTORY_SEPARATOR.'robots.txt';

        File::put($sitemapPath, $sitemap);
        File::put($robotsPath, $robots);

        $buildDir = base_path('frontend/build');
        if (File::isDirectory($buildDir)) {
            File::put($buildDir.DIRECTORY_SEPARATOR.'sitemap.xml', $sitemap);
            File::put($buildDir.DIRECTORY_SEPARATOR.'robots.txt', $robots);
            $this->info('Also copied sitemap.xml and robots.txt to frontend/build.');
        }

        $count = count(self::PATHS);
        $this->info("Wrote {$count} URLs to {$sitemapPath}");
        $this->info("Wrote {$robotsPath}");

        return self::SUCCESS;
    }

    private function buildSitemapXml(string $baseUrl, string $lastmod): string
    {
        $lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ];

        foreach (self::PATHS as $path => $priority) {
            $loc = $path === '/' ? $baseUrl.'/' : $baseUrl.$path;
            $lines[] = '  <url>';
            $lines[] = '    <loc>'.e($loc).'</loc>';
            $lines[] = '    <lastmod>'.$lastmod.'</lastmod>';
            $lines[] = '    <changefreq>weekly</changefreq>';
            $lines[] = '    <priority>'.$priority.'</priority>';
            $lines[] = '  </url>';
        }

        $lines[] = '</urlset>';
        $lines[] = '';

        return implode("\n", $lines);
    }

    private function buildRobotsTxt(string $baseUrl): string
    {
        return implode("\n", [
            'User-agent: *',
            'Allow: /',
            '',
            'Sitemap: '.$baseUrl.'/sitemap.xml',
            '',
        ]);
    }
}
