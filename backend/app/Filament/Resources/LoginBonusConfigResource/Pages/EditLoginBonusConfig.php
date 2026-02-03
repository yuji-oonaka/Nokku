<?php

namespace App\Filament\Resources\LoginBonusConfigResource\Pages;

use App\Filament\Resources\LoginBonusConfigResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditLoginBonusConfig extends EditRecord
{
    protected static string $resource = LoginBonusConfigResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
