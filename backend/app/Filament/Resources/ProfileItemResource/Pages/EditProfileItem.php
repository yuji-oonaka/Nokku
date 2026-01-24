<?php

namespace App\Filament\Resources\ProfileItemResource\Pages;

use App\Filament\Resources\ProfileItemResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditProfileItem extends EditRecord
{
    protected static string $resource = ProfileItemResource::class;
}
