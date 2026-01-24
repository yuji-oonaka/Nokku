<?php

namespace App\Filament\Resources\GachaResource\Pages;

use App\Filament\Resources\GachaResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditGacha extends EditRecord
{
    protected static string $resource = GachaResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
