import { computed, defineComponent, inject, ref } from "vue";
import "./editor.scss";
import EditorBlock from "./editor-block";
import deepcopy from "deepcopy";
import { useMenuDragger } from "./useMenuDragger";
import { useFocus } from "./useFocus";
import { useBlockDragger } from "./useBlockDragger";
import { useCommand } from "./useCommand";
import { $dialog } from "../components/Dialog";
import { ElButton } from "element-plus";
import { $dropdown, DropdownItem } from "../components/Dropdown";
import EditorOperator from "./editor-operator";

export default defineComponent({
  props: {
    modelValue: { type: Object },
    formData: { type: Object },
  },
  emits: ["update:modelValue"], // 要触发的时间
  setup(props, ctx) {
    
    //预览的时候,内容不能再操作了, 可以点击 输入内容 方便看效果
    const previewRef = ref(false);
    const editorRef = ref(true); //是否是编辑状态

    const data = computed({
      get() {
        return props.modelValue;
      },
      set(newValue) {
        ctx.emit("update:modelValue", deepcopy(newValue));
      },
    });

    const containerStyles = computed(() => ({
      width: data.value.container.width + "px",
      height: data.value.container.height + "px",
    }));

    const config = inject("config");

    const containerRef = ref(null);
    // 1.实现菜单的拖拽功能
    const { dragstart, dragend } = useMenuDragger(containerRef, data);

    // 2.实现获取焦点 选中后可能直接就进行拖拽了
    let {
      blockMousedown,
      focusData,
      containerMousedown,
      lastSelectBlock,
      clearBlockFocus,
    } = useFocus(data, previewRef, (e) => {
      // 获取焦点后进行拖拽
      mousedown(e);
    });
    // 2.实现组件拖拽
    // 3.实现拖拽多个元素的功能
    let { mousedown, markLine } = useBlockDragger(
      focusData,
      lastSelectBlock,
      data
    );
    
    //4.实现撤销与重做功能
    const { commands } = useCommand(data, focusData);

    const buttons = [
      { label: "撤销", icon: "icon-back", handle: () => commands.undo() },
      {
        label: "恢复",
        icon: "icon-forward",
        handle: () => commands.redo(),
      },
      {
        label: "导出",
        icon: "icon-export",
        handle: () => {
          //弹出表单
          $dialog({
            title: "导出json使用",
            content: JSON.stringify(data.value), // 需要是个字符串
            footer: false,
          });
        },
      },
      {
        label: "导入",
        icon: "icon-import",
        handle: () => {
          //弹出表单
          $dialog({
            title: "导入json使用",
            content: "",
            footer: true,
            onConfirm(text) {
              // data.value = JSON.parse(text); // 这样修改 无法保留历史记录
              commands.updateContainer(JSON.parse(text)); //将
            },
          });
        },
      },
      {
        label: "置顶",
        icon: "icon-place-top",
        handle: () => commands.placeTop(),
      },
      {
        label: "置底",
        icon: "icon-place-bottom",
        handle: () => commands.placeBottom(),
      },
      {
        label: "删除",
        icon: "icon-delete",
        handle: () => commands.delete(),
      },
      {
        label: () => {
          return previewRef.value ? "编辑" : "预览";
        },
        icon: () => {
          return previewRef.value ? "icon-edit" : "icon-browse";
        },
        handle: () => {
          previewRef.value = !previewRef.value;
          clearBlockFocus(); // 清空所有的边框
        },
      },
      {
        label: "关闭",
        icon: "icon-close",
        handle: () => {
          editorRef.value = false;
          clearBlockFocus();
        },
      },
    ];

    const onContextMenuBlock = (e, block) => {
      e.preventDefault();

      $dropdown({
        el: e.target, //以哪个元素为准产生一个dropdown
        content: () => {
          return (
            <>
              <DropdownItem
                label="删除"
                icon="icon-delete"
                onClick={() => commands.delete()}
              ></DropdownItem>
              <DropdownItem
                label="置顶"
                icon="icon-place-top"
                onClick={() => commands.placeTop()}
              ></DropdownItem>
              <DropdownItem
                label="置底"
                icon="icon-place-bottom"
                onClick={() => commands.placeBottom()}
              ></DropdownItem>
              <DropdownItem
                label="查看"
                icon="icon-browse"
                onClick={() => {
                  $dialog({
                    title: "查看节点数据",
                    content: JSON.stringify(block),
                  });
                }}
              ></DropdownItem>
              <DropdownItem
                label="导入"
                icon="icon-import"
                onClick={() => {
                  $dialog({
                    title: "查看节点数据",
                    content: "",
                    footer: true,
                    onConfirm(text) {
                      text = JSON.parse(text);
                      commands.updateBlock(text, block);
                    },
                  });
                }}
              ></DropdownItem>
            </>
          );
        },
      });
    };

    return () =>
      !editorRef.value ? (
        <>
          <div
            class="editor-container-canvas__content"
            style={containerStyles.value}
            style="margin:0"
          >
            {data.value.blocks.map((block, index) => (
              <EditorBlock
                class="editor-block-preview"
                block={block}
                formData={props.formData}
              ></EditorBlock>
            ))}
          </div>
          <div>
            <ElButton type="primary" onClick={() => (editorRef.value = true)}>
              继续编辑
            </ElButton>
            {JSON.stringify(props.formData)}
          </div>
        </>
      ) : (
        <div class="editor">
          {/* 左侧物料栏*/}
          <div class="editor-left">
            {/* 根据注册列表 渲染对应的内容  可以实现h5的拖拽*/}
            {config.componentList.map((component) => (
              <div
                class="editor-left-item"
                draggable
                onDragstart={(e) => dragstart(e, component)}
                onDragend={dragend}
              >
                <span>{component.label}</span>
                <div>{component.preview()}</div>
              </div>
            ))}
          </div>
          {/* 顶部菜单栏*/}
          <div class="editor-top">
            {/*根据buttons渲染按钮*/}
            {buttons.map((btn, index) => {
              const icon =
                typeof btn.icon === "function" ? btn.icon() : btn.icon;
              const label =
                typeof btn.label === "function" ? btn.label() : btn.label;

              return (
                <div class="editor-top-button" onClick={btn.handle}>
                  <i class={icon}></i>
                  <span> {label}</span>
                </div>
              );
            })}
          </div>
          {/* 右侧属性控制栏*/}
          <div class="editor-right">
            <EditorOperator
              block={lastSelectBlock.value}
              data={data.value}
              updateContainer={commands.updateContainer}
              updateBlock={commands.updateBlock}
            ></EditorOperator>
          </div>
          {/* 中间渲染画布*/}
          <div class="editor-container">
            {/*  负责产生滚动条 */}
            <div class="editor-container-canvas">
              {/* 产生内容区域 */}
              <div
                class="editor-container-canvas__content"
                style={containerStyles.value}
                ref={containerRef}
                onMousedown={containerMousedown}
              >
                {data.value.blocks.map((block, index) => (
                  <EditorBlock
                    class={block.focus ? "editor-block-focus" : ""}
                    class={previewRef.value ? "editor-block-preview" : ""}
                    block={block}
                    onMousedown={(e) => blockMousedown(e, block, index)}
                    onContextmenu={(e) => onContextMenuBlock(e, block)}
                    formData={props.formData}
                  ></EditorBlock>
                ))}

                {markLine.x !== null && (
                  <div class="line-x" style={{ left: markLine.x + "px" }}></div>
                )}
                {markLine.y !== null && (
                  <div class="line-y" style={{ top: markLine.y + "px" }}></div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
  },
});
