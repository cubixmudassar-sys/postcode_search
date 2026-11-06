<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavedList extends Model
{
    protected $fillable = ['organisation_id', 'name'];

    public function organisation(): BelongsTo
    {
        return $this->belongsTo(Organisation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SavedListItem::class);
    }
}
