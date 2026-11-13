<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Order;

use Lohndruckerei\Ordo\Core\Ordo\Event\OrdoEventCollection;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionCollection;
use Shopware\Core\Checkout\Order\OrderEntity;
use Shopware\Core\Framework\DataAbstractionLayer\Entity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityIdTrait;

class OrdoOrderEntity extends Entity
{
    use EntityIdTrait;

    protected string $orderId;
    protected string $orderVersionId;
    protected ?string $note = null;
    protected ?OrderEntity $order = null;
    protected ?OrdoPositionCollection $positions = null;
    protected ?OrdoEventCollection $events = null;

    public function getOrderId(): string { return $this->orderId; }
    public function setOrderId(string $orderId): void { $this->orderId = $orderId; }
    public function getOrderVersionId(): string { return $this->orderVersionId; }
    public function setOrderVersionId(string $orderVersionId): void { $this->orderVersionId = $orderVersionId; }
    public function getNote(): ?string { return $this->note; }
    public function setNote(?string $note): void { $this->note = $note; }
    public function getOrder(): ?OrderEntity { return $this->order; }
    public function setOrder(?OrderEntity $order): void { $this->order = $order; }
    public function getPositions(): ?OrdoPositionCollection { return $this->positions; }
    public function setPositions(OrdoPositionCollection $positions): void { $this->positions = $positions; }
    public function getEvents(): ?OrdoEventCollection { return $this->events; }
    public function setEvents(OrdoEventCollection $events): void { $this->events = $events; }
}
