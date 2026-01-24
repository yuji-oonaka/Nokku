<?php

namespace App\Filament\Resources\GachaResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class ItemsRelationManager extends RelationManager
{
    protected static string $relationship = 'items'; // Gacha.php の items() リレーション
    protected static ?string $title = '排出アイテム設定';

    public function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('weight')
                ->label('排出の重み')
                ->numeric()
                ->default(1)
                ->helperText('数値が高いほど当たりやすくなります')
                ->required(),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')->label('画像'),
                Tables\Columns\TextColumn::make('name')->label('アイテム名'),
                Tables\Columns\TextColumn::make('weight')->label('重み'),
            ])
            ->headerActions([
                Tables\Actions\AttachAction::make()
                    ->preloadRecordSelect()
                    ->form(fn(Tables\Actions\AttachAction $action): array => [
                        $action->getRecordSelect(),
                        Forms\Components\TextInput::make('weight')->numeric()->required()->default(1),
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DetachAction::make(),
            ]);
    }
}