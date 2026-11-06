<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedListItem extends Model
{
    protected $fillable = ['saved_list_id', 'postcode', 'label', 'payload'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function savedList(): BelongsTo
    {
        return $this->belongsTo(SavedList::class);
    }
}
