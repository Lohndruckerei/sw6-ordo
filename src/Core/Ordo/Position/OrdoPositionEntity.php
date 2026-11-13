<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Position;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderEntity;
use Shopware\Core\Checkout\Order\Aggregate\OrderLineItem\OrderLineItemEntity;
use Shopware\Core\Framework\DataAbstractionLayer\Entity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityIdTrait;
use Shopware\Core\System\StateMachine\Aggregation\StateMachineState\StateMachineStateEntity;

class OrdoPositionEntity extends Entity
{
    use EntityIdTrait;

    protected string $ordoOrderId;
    protected string $orderLineItemId;
    protected string $orderLineItemVersionId;
    protected string $stateId;
    protected ?string $target = null;
    protected ?string $supplierId = null;
    protected ?string $holdReason = null;
    protected ?OrdoOrderEntity $ordoOrder = null;
    protected ?OrderLineItemEntity $orderLineItem = null;
    protected ?StateMachineStateEntity $stateMachineState = null;

    public function getOrdoOrderId(): string { return $this->ordoOrderId; }
    public function setOrdoOrderId(string $ordoOrderId): void { $this->ordoOrderId = $ordoOrderId; }
    public function getOrderLineItemId(): string { return $this->orderLineItemId; }
    public function setOrderLineItemId(string $orderLineItemId): void { $this->orderLineItemId = $orderLineItemId; }
    public function getOrderLineItemVersionId(): string { return $this->orderLineItemVersionId; }
    public function setOrderLineItemVersionId(string $orderLineItemVersionId): void { $this->orderLineItemVersionId = $orderLineItemVersionId; }
    public function getStateId(): string { return $this->stateId; }
    public function setStateId(string $stateId): void { $this->stateId = $stateId; }
    public function getTarget(): ?string { return $this->target; }
    public function setTarget(?string $target): void { $this->target = $target; }
    public function getSupplierId(): ?string { return $this->supplierId; }
    public function setSupplierId(?string $supplierId): void { $this->supplierId = $supplierId; }
    public function getHoldReason(): ?string { return $this->holdReason; }
    public function setHoldReason(?string $holdReason): void { $this->holdReason = $holdReason; }
    public function getOrdoOrder(): ?OrdoOrderEntity { return $this->ordoOrder; }
    public function setOrdoOrder(?OrdoOrderEntity $ordoOrder): void { $this->ordoOrder = $ordoOrder; }
    public function getOrderLineItem(): ?OrderLineItemEntity { return $this->orderLineItem; }
    public function setOrderLineItem(?OrderLineItemEntity $orderLineItem): void { $this->orderLineItem = $orderLineItem; }
    public function getStateMachineState(): ?StateMachineStateEntity { return $this->stateMachineState; }
    public function setStateMachineState(?StateMachineStateEntity $state): void { $this->stateMachineState = $state; }
}
