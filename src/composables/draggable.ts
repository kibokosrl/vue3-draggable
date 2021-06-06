import { ref, onMounted, onUpdated, watch, SetupContext, Ref } from "vue";
import { notDragging } from "../constants";
import { DraggableItem } from "../types/draggable-item.interface";
import { changeArrayOrder } from "../utils/change-order";
import { getIdGenerator } from "../utils/id-generator";
import { throttle } from "../utils/throttle";

let itemCurrentlyDragging = ref<DraggableItem>({ id: notDragging });
let containerIdCurrentlyDraggedOver = ref<number>(null);
let transitioning = false;
const containerIdGenerator = getIdGenerator();

const useDraggableContainer = (
  originalItems: Ref<Array<DraggableItem>>,
  context: SetupContext
) => {
  const items = ref(originalItems.value);
  const id = containerIdGenerator();

  // update v-model when dropped
  watch(itemCurrentlyDragging, () => {
    if (itemCurrentlyDragging.value.id === notDragging) {
      context.emit("update:modelValue", items.value);
    }
  });

  // case when an item is being dragged to another container
  watch(containerIdCurrentlyDraggedOver, () => {
    if (containerIdCurrentlyDraggedOver.value === id) {
      return;
    }
    items.value = items.value.filter(
      (item) => item.id !== itemCurrentlyDragging.value.id
    );
  });

  // when an item is moved to an empty container
  const onDragOver = () => {
    if (
      transitioning ||
      itemCurrentlyDragging.value.id === notDragging ||
      containerIdCurrentlyDraggedOver.value === id
    ) {
      return;
    }

    if (items.value.length > 0) {
      return;
    }

    containerIdCurrentlyDraggedOver.value = id;
    items.value = [itemCurrentlyDragging.value];
  };

  // handle event emitted from draggableItem
  const onItemDragOver = ({ position }: { position: number }) => {
    if (transitioning || itemCurrentlyDragging.value.id === notDragging) {
      return;
    }
    items.value = changeArrayOrder(
      items.value,
      itemCurrentlyDragging.value,
      position
    );
  };

  return {
    id,
    items,
    onDragOver,
    onItemDragOver,
  };
};

const useDraggableItem = (
  item: Ref<DraggableItem>,
  position: Ref<number>,
  containerId: Ref<number>,
  context: SetupContext
) => {
  const draggableItemEl = ref(null);
  const isDragging = ref(
    item.value.id === itemCurrentlyDragging.value.id ? true : false
  );
  const middleY = ref(null);

  onMounted(async () => {
    const box = draggableItemEl.value.getBoundingClientRect();
    middleY.value = box.top + box.height / 2;
  });

  onUpdated(() => {
    const box = draggableItemEl.value.getBoundingClientRect();
    middleY.value = box.top + box.height / 2;
  });

  const onDragStart = () => {
    itemCurrentlyDragging.value = item.value;
    containerIdCurrentlyDraggedOver.value = containerId.value;
    isDragging.value = true;
  };

  const onDragEnd = () => {
    itemCurrentlyDragging.value = { id: notDragging };
  };

  const onDragOver = throttle((e: DragEvent) => {
    if (item.value.id === itemCurrentlyDragging.value.id) {
      return;
    }

    if (containerIdCurrentlyDraggedOver.value !== containerId.value) {
      containerIdCurrentlyDraggedOver.value = containerId.value;
    }

    const offset = middleY.value - e.clientY;

    context.emit("itemDragOver", {
      position: offset > 0 ? position.value : position.value + 1,
    });
  }, 50);

  const transitionStart = () => {
    transitioning = true;
  };

  const transitionEnd = () => {
    transitioning = false;
  };

  watch(itemCurrentlyDragging, () => {
    if (itemCurrentlyDragging.value.id !== notDragging) {
      return;
    }
    isDragging.value = false;
  });

  return {
    draggableItemEl,
    isDragging,
    onDragStart,
    onDragOver,
    onDragEnd,
    transitionStart,
    transitionEnd,
  };
};

export { useDraggableContainer, useDraggableItem };
