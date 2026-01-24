<?php

namespace App\Filament\Resources\ProfileItemResource\Pages;

use App\Filament\Resources\ProfileItemResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListProfileItems extends ListRecords
{
    protected static string $resource = ProfileItemResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // これが「作成」ボタンの正体です
            Actions\CreateAction::make(),
        ];
    }
}
