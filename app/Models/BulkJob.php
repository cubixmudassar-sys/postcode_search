<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BulkJob extends Model
{
    protected $fillable = [
        'organisation_id',
        'user_id',
        'status',
        'step',
        'filename',
        'mapped_column',
        'row_count',
    ];

    protected function casts(): array
    {
        return [
            'step' => 'integer',
            'row_count' => 'integer',
        ];
    }

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
