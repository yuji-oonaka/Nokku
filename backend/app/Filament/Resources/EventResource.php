<?php

namespace App\Filament\Resources;

use App\Filament\Resources\EventResource\Pages;
use App\Models\Event;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use App\Filament\Resources\EventResource\RelationManagers;

class EventResource extends Resource
{
    protected static ?string $model = Event::class;

    protected static ?string $navigationIcon = 'heroicon-o-calendar';

    protected static ?string $navigationLabel = 'イベント管理';

    // ▼▼▼ 追加: サイドバーのグループ設定 ▼▼▼
    protected static ?string $navigationGroup = 'コンテンツ管理';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // アーティスト選択
                Forms\Components\Select::make('artist_id')
                    ->relationship('artist', 'nickname')
                    ->label('開催アーティスト')
                    ->searchable()
                    ->required()
                    ->disabled(fn () => auth()->user()->role !== 'admin')
                    ->default(fn () => auth()->user()->role !== 'admin' ? auth()->id() : null)
                    ->dehydrated(),

                Forms\Components\TextInput::make('title')
                    ->label('イベント名')
                    ->required()
                    ->maxLength(255),

                Forms\Components\DateTimePicker::make('event_date')
                    ->label('開催日時')
                    ->required(),

                Forms\Components\TextInput::make('venue')
                    ->label('会場')
                    ->maxLength(255),

                // 画像URL
                Forms\Components\FileUpload::make('image_url')
                    ->label('イベント画像')
                    ->image()
                    ->directory('events') // ディレクトリをeventsに変更しました
                    ->disk('public')
                    ->visibility('public')
                    ->formatStateUsing(function ($record) {
                        if (!$record || !$record->getRawOriginal('image_url')) {
                            return [];
                        }
                        $url = $record->getRawOriginal('image_url');
                        if (str_starts_with($url, 'http')) {
                            return [];
                        }
                        return [$url];
                    }),
                
                Forms\Components\Textarea::make('description')
                    ->label('詳細・説明')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('画像')
                    ->square(),

                Tables\Columns\TextColumn::make('title')
                    ->label('イベント名')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('artist.nickname')
                    ->label('アーティスト')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('event_date')
                    ->label('開催日時')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),

                Tables\Columns\TextColumn::make('venue')
                    ->label('会場')
                    ->searchable(),

                // ▼▼▼ 追加案1: 販売枚数合計 ▼▼▼
                Tables\Columns\TextColumn::make('tickets_sold')
                    ->label('販売数')
                    ->state(function ($record) {
                        // TicketType経由でUserTicket(実際に売れた枚数)を合計
                        // ※ UserTicketモデルとリレーションが正しく組まれている前提です
                        return $record->ticketTypes->sum(function ($type) {
                            return $type->userTickets ? $type->userTickets->count() : 0;
                        }) . '枚';
                    }),

                // ▼▼▼ 追加案2: 売上金額合計 (イベント単位) ▼▼▼
                Tables\Columns\TextColumn::make('sales_total')
                    ->label('売上合計')
                    ->money('JPY')
                    ->state(function ($record) {
                        return $record->ticketTypes->sum(function ($type) {
                            $count = $type->userTickets ? $type->userTickets->count() : 0;
                            return $count * $type->price;
                        });
                    }),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\TicketTypesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListEvents::route('/'),
            'create' => Pages\CreateEvent::route('/create'),
            'edit' => Pages\EditEvent::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();

        if (auth()->user()->role !== 'admin') {
            $query->where('artist_id', auth()->id());
        }

        return $query;
    }
}