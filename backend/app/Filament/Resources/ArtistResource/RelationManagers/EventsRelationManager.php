<?php

namespace App\Filament\Resources\ArtistResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use App\Models\Event; // 追加

class EventsRelationManager extends RelationManager
{
    protected static string $relationship = 'events';

    protected static ?string $title = '開催イベント';

    protected static ?string $icon = 'heroicon-o-calendar';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('title')
                    ->required()
                    ->maxLength(255)
                    ->label('イベント名'),
                
                Forms\Components\DateTimePicker::make('event_date')
                    ->required()
                    ->label('開催日時'),

                Forms\Components\TextInput::make('venue')
                    ->label('会場')
                    ->maxLength(255),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('title')
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('イベント名')
                    ->sortable(),

                Tables\Columns\TextColumn::make('event_date')
                    ->label('開催日時')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),

                // チケット販売数合計
                Tables\Columns\TextColumn::make('sales_count')
                    ->label('チケット販売数')
                    // N+1問題を避けるため、リレーションをロードしてから集計する記述だとより安全ですが、
                    // ここでは提示されたロジックを採用しつつ、エラー回避のためloadチェックを入れています
                    ->state(function (Event $record) {
                        return $record->ticketTypes->sum(function ($type) {
                             return $type->userTickets ? $type->userTickets->count() : 0;
                        }) . '枚';
                    }),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()->label('イベント追加'),
            ])
            ->actions([
                // 詳細・チケット管理へのリンク
                Tables\Actions\Action::make('manage_tickets')
                    ->label('詳細・チケット管理')
                    ->icon('heroicon-m-ticket')
                    ->url(fn (Event $record): string => route('filament.admin.resources.events.edit', $record)),

                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ]);
    }
}