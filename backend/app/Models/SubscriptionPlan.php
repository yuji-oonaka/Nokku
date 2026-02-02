<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'plan_id',
        'rank',
        'name',
        'price_yen',
        'monthly_points',
        'description',
        'stripe_price_id',
        'color_code',
        'is_recommended',
    ];
}
