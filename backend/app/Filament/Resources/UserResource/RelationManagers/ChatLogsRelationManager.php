<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ChatLogsRelationManager extends RelationManager
{
    protected static string $relationship = 'chatLogs';

    protected static ?string $title = 'チャット送信履歴';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('status')
            ->columns([
                // 1. 送信日時
                Tables\Columns\TextColumn::make('created_at')
                    ->label('送信日時')
                    ->dateTime()
                    ->sortable(),

                // 2. イベント名（リレーションがある場合）
                Tables\Columns\TextColumn::make('event_id')
                    ->label('イベント/ルーム')
                    ->formatStateUsing(fn($record) => "Event: {$record->event_id} / Room: {$record->room_id}"),

                // 3. 無料・有料の判別
                Tables\Columns\TextColumn::make('is_free')
                    ->label('区分')
                    ->badge()
                    ->formatStateUsing(fn(bool $state): string => $state ? '無料枠' : '有料枠')
                    ->color(fn(bool $state): string => $state ? 'gray' : 'warning'),

                // 4. 消費ポイント
                Tables\Columns\TextColumn::make('consumed_points')
                    ->label('消費pt')
                    ->formatStateUsing(fn($state) => $state > 0 ? "-{$state} pt" : '0 pt')
                    ->color(fn($state) => $state > 0 ? 'danger' : 'gray'),

                // 5. ステータス（バッジ形式：非推奨回避済み）
                Tables\Columns\TextColumn::make('status')
                    ->label('状態')
                    ->badge()
                    ->color(fn(string $state): string => match ($state) {
                        'success' => 'success',
                        'failed' => 'danger',
                        default => 'gray',
                    }),

                // 6. エラーメッセージ (失敗時のみ表示)
                Tables\Columns\TextColumn::make('error_code')
                    ->label('エラー詳細')
                    ->placeholder('-'),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
