<?php

namespace App\Filament\Resources\OrderResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class ItemsRelationManager extends RelationManager
{
    protected static string $relationship = 'items';

    // 画面上の見出し
    protected static ?string $title = '購入商品（内訳）';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('product_name')
            ->columns([
                // 商品名（OrderItemにはproductリレーションがある前提）
                Tables\Columns\TextColumn::make('product.name')
                    ->label('商品名'),

                // 価格
                Tables\Columns\TextColumn::make('price_at_purchase')
                    ->money('JPY')
                    ->label('単価'),

                // 個数
                Tables\Columns\TextColumn::make('quantity')
                    ->label('個数'),
                
                // 小計（単価 × 個数）を表示するカスタムカラム
                Tables\Columns\TextColumn::make('subtotal')
                    ->label('小計')
                    ->state(function ($record) {
                        return '¥' . number_format($record->price_at_purchase * $record->quantity);
                    }),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                // 注文詳細をここから追加することはあまりないので、Createは消しておきます
                // Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                // 編集・削除も基本しないので消してOKですが、一旦残しても可
                // Tables\Actions\EditAction::make(),
                // Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                // Tables\Actions\BulkActionGroup::make([
                //     Tables\Actions\DeleteBulkAction::make(),
                // ]),
            ]);
    }
}