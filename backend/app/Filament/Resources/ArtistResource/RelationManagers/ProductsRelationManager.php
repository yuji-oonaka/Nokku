<?php

namespace App\Filament\Resources\ArtistResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use App\Models\Product; // 追加

class ProductsRelationManager extends RelationManager
{
    protected static string $relationship = 'products';

    protected static ?string $title = '販売グッズ';

    protected static ?string $icon = 'heroicon-o-tag';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->label('商品名'),

                Forms\Components\TextInput::make('price')
                    ->required()
                    ->numeric()
                    ->prefix('¥')
                    ->label('価格'),
                
                Forms\Components\TextInput::make('stock')
                    ->required()
                    ->numeric()
                    ->label('在庫数'),
                
                // 画像設定をProductResourceと統一
                Forms\Components\FileUpload::make('image_url')
                    ->label('グッズ画像')
                    ->image()
                    ->directory('products')
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
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('name')
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('画像')
                    ->square(),

                Tables\Columns\TextColumn::make('name')
                    ->label('商品名')
                    ->sortable(),

                Tables\Columns\TextColumn::make('price')
                    ->money('JPY')
                    ->label('価格')
                    ->sortable(),

                Tables\Columns\TextColumn::make('stock')
                    ->label('在庫')
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()->label('グッズ登録'),
            ])
            ->actions([
                // ★ 詳細編集へのリンク（ProductResourceへ移動）
                Tables\Actions\Action::make('manage_product')
                    ->label('詳細編集')
                    ->icon('heroicon-m-pencil-square')
                    ->url(fn (Product $record): string => route('filament.admin.resources.products.edit', $record)),

                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ]);
    }
}