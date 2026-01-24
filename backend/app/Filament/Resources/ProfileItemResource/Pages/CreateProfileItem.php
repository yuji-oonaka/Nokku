<?php

namespace App\Filament\Resources\ProfileItemResource\Pages;

use App\Filament\Resources\ProfileItemResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateProfileItem extends CreateRecord
{
    protected static string $resource = ProfileItemResource::class;
}
