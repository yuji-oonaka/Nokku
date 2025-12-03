<?php

namespace App\Filament\Resources;

use App\Filament\Resources\EventResource\Pages;
use App\Models\Event;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class EventResource extends Resource
{
    protected static ?string $model = Event::class;

    protected static ?string $navigationIcon = 'heroicon-o-calendar'; // アイコンをカレンダーに

    protected static ?string $navigationLabel = 'イベント管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // アーティスト選択 (運営が付け替えることは稀ですが、一応可能に)
                Forms\Components\Select::make('artist_id')
                    ->relationship('artist', 'nickname') // Userモデルのnicknameを表示
                    ->label('開催アーティスト')
                    ->searchable()
                    ->required(),

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

                // 画像 (URL入力式ですが、画像としてプレビュー表示)
                Forms\Components\TextInput::make('image_url')
                    ->label('画像URL')
                    ->url(),
                
                Forms\Components\Textarea::make('description')
                    ->label('詳細・説明')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                // 画像を表示 (円形ではなく四角で)
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('画像')
                    ->square(),

                Tables\Columns\TextColumn::make('title')
                    ->label('イベント名')
                    ->searchable()
                    ->sortable(),

                // アーティスト名
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
            ])
            ->filters([
                // 未来のイベントだけに絞るフィルターなどを追加可能
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
            // チケット種別（S席、A席など）を管理したければここに追加
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
}