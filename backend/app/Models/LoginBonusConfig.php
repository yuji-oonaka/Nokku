<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginBonusConfig extends Model
{
    protected $fillable = ['amount', 'is_active'];
}
