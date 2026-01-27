<?php

namespace App\Filament\Resources\UserResource\RelationManagers;

use Filament\Forms;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PointTransactionsRelationManager extends RelationManager
{
    protected static string $relationship = 'pointTransactions';

    protected static ?string $title = 'ポイント取引履歴';

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('description')
            ->columns([
                // 1. 日時
                Tables\Columns\TextColumn::make('created_at')
                    ->label('取引日時')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),

                // 2. 種別（バッジ表示で見やすく）
                Tables\Columns\TextColumn::make('type')
                    ->label('種別')
                    ->badge()
                    ->formatStateUsing(fn(string $state): string => match ($state) {
                        'gacha_spin' => 'ガチャ消費',
                        'gacha_refund' => 'ガチャ還元',
                        'chat_message' => 'チャット消費',
                        'admin_add' => '運営付与',
                        default => $state,
                    })
                    ->color(fn(string $state): string => match ($state) {
                        'admin_add', 'gacha_refund' => 'success',
                        'gacha_spin', 'chat_message' => 'danger',
                        default => 'gray',
                    }),

                // 3. 増減額
                Tables\Columns\TextColumn::make('amount')
                    ->label('増減')
                    ->numeric()
                    ->formatStateUsing(fn($state) => ($state > 0 ? '+' : '') . number_format($state) . ' pt')
                    ->color(fn($state) => $state > 0 ? 'success' : 'danger')
                    ->weight('bold'),

                // 4. 取引後残高
                Tables\Columns\TextColumn::make('balance_after')
                    ->label('残高')
                    ->numeric()
                    ->formatStateUsing(fn($state) => number_format($state) . ' pt'),

                // 5. 内容説明
                Tables\Columns\TextColumn::make('description')
                    ->label('取引内容')
                    ->searchable(),
            ])
            ->filters([
                // 種別でフィルタリングできるように
                Tables\Filters\SelectFilter::make('type')
                    ->label('種別絞り込み')
                    ->options([
                        'gacha_spin' => 'ガチャ',
                        'chat_message' => 'チャット',
                        'admin_add' => '運営付与',
                    ]),
            ])
            ->defaultSort('created_at', 'desc'); // 新しい順に表示
    }
}
