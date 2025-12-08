<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static ?string $navigationIcon = 'heroicon-o-tag'; // アイコンをタグに変更

    protected static ?string $navigationLabel = 'グッズ管理';

    protected static ?string $navigationGroup = 'コンテンツ管理';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // 出品アーティスト
                Forms\Components\Select::make('artist_id')
                    ->relationship('artist', 'nickname')
                    ->label('販売アーティスト')
                    ->searchable()
                    ->required()
                    // 管理者じゃなければ「無効化（グレーアウト）」して自動選択させる
                    ->disabled(fn () => auth()->user()->role !== 'admin')
                    ->default(fn () => auth()->user()->role !== 'admin' ? auth()->id() : null)
                    // データとして送信されるように設定（disabledだと送信されないため）
                    ->dehydrated(),

                Forms\Components\TextInput::make('name')
                    ->label('商品名')
                    ->required()
                    ->maxLength(255),

                // 金額入力
                Forms\Components\TextInput::make('price')
                    ->label('価格')
                    ->required()
                    ->numeric()
                    ->prefix('¥')
                    ->minValue(0),

                Forms\Components\TextInput::make('stock')
                    ->label('在庫数')
                    ->required()
                    ->numeric()
                    ->default(0)
                    ->minValue(0),

                // 購入制限（お一人様何個まで）
                Forms\Components\TextInput::make('limit_per_user')
                    ->label('購入制限数')
                    ->numeric()
                    ->suffix('個')
                    ->helperText('※ 0または空欄で無制限'),

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
                    ->label('商品説明')
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

                Tables\Columns\TextColumn::make('name')
                    ->label('商品名')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('artist.nickname')
                    ->label('販売アーティスト')
                    ->searchable()
                    ->visible(fn () => auth()->user()->role === 'admin'),

                Tables\Columns\TextColumn::make('price')
                    ->label('価格')
                    ->money('JPY')
                    ->sortable(),

                Tables\Columns\TextColumn::make('stock')
                    ->label('在庫')
                    ->numeric()
                    ->sortable(),

                Tables\Columns\TextColumn::make('limit_per_user')
                    ->label('購入制限')
                    ->formatStateUsing(fn ($state) => $state ? "{$state}個まで" : '無制限')
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
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
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