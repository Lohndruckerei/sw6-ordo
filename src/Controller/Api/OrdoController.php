<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Controller\Api;

use Lohndruckerei\Ordo\Service\OrderFileService;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\StateMachine\Exception\IllegalTransitionException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Admin-API von Ordo. Statuswechsel nur hierüber (nicht über die generische State-Machine-Route),
 * damit jeder Wechsel mit Grund im Protokoll landet.
 */
#[Route(defaults: ['_routeScope' => ['api']])]
class OrdoController extends AbstractController
{
    private const MAX_REASON = 500;

    public function __construct(private readonly OrderFileService $orderFileService)
    {
    }

    #[Route(
        path: '/api/_action/ld-ordo/position/{positionId}/transitions',
        name: 'api.action.ld-ordo.position.transitions',
        defaults: ['_acl' => ['ld_ordo_position:read']],
        methods: ['GET'],
    )]
    public function transitions(string $positionId, Context $context): Response
    {
        if (!Uuid::isValid($positionId)) {
            return new JsonResponse(null, Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse(['transitions' => $this->orderFileService->availableTransitions($positionId, $context)]);
    }

    #[Route(
        path: '/api/_action/ld-ordo/position/{positionId}/transition/{action}',
        name: 'api.action.ld-ordo.position.transition',
        defaults: ['_acl' => ['ld_ordo_position:update']],
        methods: ['POST'],
    )]
    public function transition(string $positionId, string $action, Request $request, Context $context): Response
    {
        if (!Uuid::isValid($positionId)) {
            return new JsonResponse(null, Response::HTTP_NOT_FOUND);
        }

        $reason = $request->request->get('reason');
        $reason = \is_string($reason) ? mb_substr(trim($reason), 0, self::MAX_REASON) : null;
        if ($action === 'hold' && ($reason === null || $reason === '')) {
            return $this->error('Zum Anhalten bitte einen Grund angeben, z. B. „Rückfrage zur Folienfarbe offen“.');
        }

        try {
            $position = $this->orderFileService->transition($positionId, $action, $reason, $context);
        } catch (IllegalTransitionException) {
            return $this->error('Dieser Statuswechsel ist im aktuellen Status nicht erlaubt. Bitte Seite neu laden.');
        }

        return new JsonResponse(['stateId' => $position->getStateId()]);
    }

    #[Route(
        path: '/api/_action/ld-ordo/order/{orderId}/ensure',
        name: 'api.action.ld-ordo.order.ensure',
        defaults: ['_acl' => ['ld_ordo_order:create']],
        methods: ['POST'],
    )]
    public function ensure(string $orderId, Context $context): Response
    {
        if (!Uuid::isValid($orderId)) {
            return new JsonResponse(null, Response::HTTP_NOT_FOUND);
        }
        $id = $this->orderFileService->ensure($orderId, $context, 'manual');

        return $id === null ? new JsonResponse(null, Response::HTTP_NOT_FOUND) : new JsonResponse(['id' => $id]);
    }

    #[Route(
        path: '/api/_action/ld-ordo/order/{ordoOrderId}/note',
        name: 'api.action.ld-ordo.order.note',
        defaults: ['_acl' => ['ld_ordo_event:create']],
        methods: ['POST'],
    )]
    public function note(string $ordoOrderId, Request $request, Context $context): Response
    {
        $text = $request->request->get('text');
        if (!Uuid::isValid($ordoOrderId) || !\is_string($text) || trim($text) === '') {
            return $this->error('Bitte einen Text für die Notiz eingeben.');
        }
        $this->orderFileService->log($ordoOrderId, 'note', mb_substr(trim($text), 0, 5000), null, $context);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    private function error(string $detail): JsonResponse
    {
        return new JsonResponse(['errors' => [['code' => 'LD_ORDO__INVALID', 'detail' => $detail]]], Response::HTTP_BAD_REQUEST);
    }
}
