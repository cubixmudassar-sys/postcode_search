<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    public const LOOKUP_PER_PAGE = 'lookup.per_page';

    public const LOOKUP_PAGINATION_ENABLED = 'lookup.pagination_enabled';

    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        return Cache::remember("app_setting.{$key}", 60, function () use ($key, $default) {
            $setting = static::query()->where('key', $key)->first();

            return $setting?->value ?? $default;
        });
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value === null ? null : (string) $value],
        );

        Cache::forget("app_setting.{$key}");
    }

    public static function lookupPerPage(): int
    {
        $value = (int) static::getValue(self::LOOKUP_PER_PAGE, 5);

        return max(1, min(100, $value > 0 ? $value : 5));
    }

    public static function lookupPaginationEnabled(): bool
    {
        $value = static::getValue(self::LOOKUP_PAGINATION_ENABLED, '1');

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}
