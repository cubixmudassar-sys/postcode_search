<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organisation extends Model
{
    protected $fillable = [
        'name',
        'credit_balance',
        'monthly_spend',
        'plan',
        'is_active',
        'auto_topup_enabled',
        'auto_topup_amount',
        'auto_topup_cap',
        'vat_number',
        'billing_name',
        'billing_phone',
        'card_last4',
        'card_brand',
        'card_expires',
    ];

    protected function casts(): array
    {
        return [
            'credit_balance' => 'decimal:2',
            'monthly_spend' => 'decimal:2',
            'is_active' => 'boolean',
            'auto_topup_enabled' => 'boolean',
            'auto_topup_amount' => 'decimal:2',
            'auto_topup_cap' => 'decimal:2',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    public function usageLogs(): HasMany
    {
        return $this->hasMany(UsageLog::class);
    }

    public function savedLists(): HasMany
    {
        return $this->hasMany(SavedList::class);
    }

    public function bulkJobs(): HasMany
    {
        return $this->hasMany(BulkJob::class);
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }
}
