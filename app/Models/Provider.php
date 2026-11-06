<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Provider extends Model
{
    protected $fillable = ['name', 'uptime_pct', 'latency_ms', 'status'];

    protected function casts(): array
    {
        return [
            'uptime_pct' => 'decimal:2',
            'latency_ms' => 'integer',
        ];
    }
}
