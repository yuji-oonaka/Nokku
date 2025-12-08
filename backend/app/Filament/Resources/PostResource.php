<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PostResource\Pages;
use App\Models\Post;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationIcon = 'heroicon-o-megaphone'; // アイコンをメガホンに

    protected static ?string $navigationLabel = 'お知らせ管理';

    protected static ?string $navigationGroup = 'コンテンツ管理';
    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // 投稿者 (アーティスト)
                Forms\Components\Select::make('user_id')
                    ->relationship('user', 'nickname')
                    ->label('投稿者')
                    ->searchable()
                    ->required()
                    // 管理者じゃなければ「無効化（グレーアウト）」して自動選択させる
                    ->disabled(fn () => auth()->user()->role !== 'admin')
                    ->default(fn () => auth()->user()->role !== 'admin' ? auth()->id() : null)
                    // データとして送信されるように設定（disabledだと送信されないため）
                    ->dehydrated(),

                Forms\Components\TextInput::make('title')
                    ->label('タイトル')
                    ->required()
                    ->maxLength(255)
                    ->columnSpanFull(),

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

                // 本文
                Forms\Components\Textarea::make('content')
                    ->label('本文')
                    ->required()
                    ->rows(10) // 少し広めに
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
                    ->label('タイトル')
                    ->searchable()
                    ->sortable()
                    ->limit(30), // 長すぎる場合は省略

                Tables\Columns\TextColumn::make('user.nickname')
                    ->label('投稿者')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('投稿日時')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),
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
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPosts::route('/'),
            'create' => Pages\CreatePost::route('/create'),
            'edit' => Pages\EditPost::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        // 親のクエリを取得
        $query = parent::getEloquentQuery();

        // もしログインユーザーが「管理者(admin)」じゃなければ
        if (auth()->user()->role !== 'admin') {
            $query->where('user_id', auth()->id());
        }

        return $query;
    }
}