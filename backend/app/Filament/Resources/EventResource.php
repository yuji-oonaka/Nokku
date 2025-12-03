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
                    ->relationship('artist', 'nickname')
                    ->label('開催アーティスト')
                    ->searchable()
                    ->required()
                    // 管理者じゃなければ「無効化（グレーアウト）」して自動選択させる
                    ->disabled(fn () => auth()->user()->role !== 'admin')
                    ->default(fn () => auth()->user()->role !== 'admin' ? auth()->id() : null)
                    // データとして送信されるように設定（disabledだと送信されないため）
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
                    ->label('グッズ画像')
                    ->image()
                    ->directory('products')
                    ->disk('public')
                    ->visibility('public')
                    // ▼▼▼ 修正: 戻り値を「配列」にする！ ▼▼▼
                    ->formatStateUsing(function ($record) {
                        // 1. レコードがない、または画像URLがない場合は「空の配列」を返す
                        if (!$record || !$record->getRawOriginal('image_url')) {
                            return [];
                        }

                        // 2. DBの生のデータを取得
                        $url = $record->getRawOriginal('image_url');

                        // 3. もし外部URL(http)なら、表示できないので「空の配列」を返す
                        if (str_starts_with($url, 'http')) {
                            return [];
                        }

                        // 4. それ以外なら「配列に入れて」返す
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

    public static function getEloquentQuery(): Builder
    {
        // 親のクエリを取得
        $query = parent::getEloquentQuery();

        // もしログインユーザーが「管理者(admin)」じゃなければ
        if (auth()->user()->role !== 'admin') {
            // 「自分のID (artist_id)」のデータだけに絞り込む
            $query->where('artist_id', auth()->id());
        }

        return $query;
    }
}