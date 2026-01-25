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
use Illuminate\Support\Facades\Auth;

class EventResource extends Resource
{
    protected static ?string $model = Event::class;

    protected static ?string $navigationIcon = 'heroicon-o-calendar'; // アイコンをカレンダーに

    protected static ?string $navigationLabel = 'イベント管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // 開催アーティスト
                Forms\Components\Select::make('artist_id')
                    ->relationship('artist', 'nickname')
                    ->label('開催アーティスト')
                    ->searchable()
                    ->required()
                    // ★修正: 型安全なチェックを行い、管理者以外は編集不可
                    ->disabled(function () {
                        /** @var \App\Models\User|null $user */
                        $user = Auth::user();
                        return !($user instanceof \App\Models\User && $user->isAdmin());
                    })
                    ->default(fn() => Auth::id())
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

                // 画像URL (既存のロジックを完全に維持)
                Forms\Components\FileUpload::make('image_url')
                    ->label('イベント画像')
                    ->image()
                    ->directory('events') // 念のためディレクトリ名をイベントに合わせることも検討
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

    /**
     * ★重要: 表示データの制限ロジック
     * 他人のイベントへのアクセスをデータベースレベルで遮断します。
     */
    public static function getEloquentQuery(): Builder
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        $query = parent::getEloquentQuery();

        // ログインユーザーがApp\Models\Userでない場合はアクセス不可
        if (!$user instanceof \App\Models\User) {
            return $query->whereRaw('1 = 0');
        }

        // 管理者は全件表示
        if ($user->isAdmin()) {
            return $query;
        }

        // アーティストは「自分のイベント」のみ表示
        if ($user->isArtist()) {
            return $query->where('artist_id', $user->id);
        }

        // それ以外は物理的に遮断
        return $query->whereRaw('1 = 0');
    }
}