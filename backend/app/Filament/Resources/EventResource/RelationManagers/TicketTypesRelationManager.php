<?php

namespace App\Filament\Resources\EventResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use App\Models\TicketType;

class TicketTypesRelationManager extends RelationManager
{
    protected static string $relationship = 'ticketTypes';

    protected static ?string $title = 'チケット販売状況'; // タイトルを日本語化

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->label('券種名'),
                Forms\Components\TextInput::make('price')
                    ->required()
                    ->numeric()
                    ->prefix('¥')
                    ->label('価格'),
                Forms\Components\TextInput::make('capacity')
                    ->required()
                    ->numeric()
                    ->label('定員 (在庫)'),
                Forms\Components\Select::make('seating_type')
                    ->options([
                        'random' => '自動座席指定',
                        'free' => '自由席',
                    ])
                    ->required()
                    ->default('free')
                    ->label('座席タイプ'),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('券種名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('price')
                    ->money('JPY')
                    ->label('価格')
                    ->sortable(),

                Tables\Columns\TextColumn::make('capacity')
                    ->numeric()
                    ->label('定員'),

                // ★ 販売数 (userTicketsテーブルの件数をカウント)
                Tables\Columns\TextColumn::make('user_tickets_count')
                    ->counts('userTickets')
                    ->label('販売済')
                    ->sortable(),

                // ★ 売上金額 (価格 × 販売数) を計算して表示
                Tables\Columns\TextColumn::make('revenue')
                    ->label('売上予測')
                    ->state(function (Model $record): string {
                        // $record は TicketType モデル
                        $count = $record->userTickets()->count();
                        return '¥' . number_format($count * $record->price);
                    }),

                // ★ 残り枚数 (定員 - 販売数)
                Tables\Columns\TextColumn::make('remaining_stock')
                    ->label('残り')
                    ->state(function (Model $record): string {
                        $count = $record->userTickets()->count();
                        return ($record->capacity - $count) . '枚';
                    })
                    ->color(fn (string $state): string => (intval($state) <= 0) ? 'danger' : 'success')
                    ->badge(),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('券種を追加'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}