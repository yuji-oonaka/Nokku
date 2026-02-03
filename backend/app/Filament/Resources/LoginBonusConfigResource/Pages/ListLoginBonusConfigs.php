<?php

namespace App\Filament\Resources\LoginBonusConfigResource\Pages;

use App\Filament\Resources\LoginBonusConfigResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListLoginBonusConfigs extends ListRecords
{
    protected static string $resource = LoginBonusConfigResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
