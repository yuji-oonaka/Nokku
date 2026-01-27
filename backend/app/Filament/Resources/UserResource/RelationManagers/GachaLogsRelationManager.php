<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class GachaLogsRelationManager extends RelationManager
{
    protected static string $relationship = 'gachaLogs'; // Userモデルのリレーション名

    protected static ?string $title = 'ガチャ実行履歴';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('status')
            ->modifyQueryUsing(fn(Builder $query) => $query->with(['gacha', 'gachaItem.profileItem'])) // 関連データを一括取得
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('実行日時')
                    ->dateTime()
                    ->sortable(),

                Tables\Columns\TextColumn::make('gacha.name')
                    ->label('ガチャ名')
                    ->searchable(),

                // 当選アイテムの画像と名前を表示
                Tables\Columns\ImageColumn::make('gachaItem.profileItem.image_url')
                    ->label('景品')
                    ->circular(),

                Tables\Columns\TextColumn::make('gachaItem.profileItem.name')
                    ->label('当選アイテム')
                    ->description(fn($record) => "レアリティ: " . ($record->gachaItem->profileItem->rarity ?? '-')),

                // 重複したかどうかのフラグ
                Tables\Columns\IconColumn::make('is_duplicate')
                    ->label('重複')
                    ->boolean()
                    ->trueIcon('heroicon-o-arrow-path')
                    ->trueColor('warning')
                    ->falseIcon('heroicon-o-check-badge')
                    ->falseColor('success'),

                Tables\Columns\TextColumn::make('consumed_points')
                    ->label('消費pt')
                    ->suffix(' pt'),

                Tables\Columns\TextColumn::make('status')
                    ->label('状態')
                    ->badge() // これでバッジ化されます
                    ->color(fn(string $state): string => match ($state) {
                        'success' => 'success',
                        'failed' => 'danger',
                        default => 'gray',
                    }),
                ])
                ->defaultSort('created_at', 'desc');
    }
}
